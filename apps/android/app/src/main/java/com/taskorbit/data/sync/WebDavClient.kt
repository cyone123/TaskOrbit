package com.taskorbit.data.sync

import android.util.Base64
import com.taskorbit.domain.model.WebDavSettings
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.util.concurrent.TimeUnit

class WebDavException(message: String, val statusCode: Int = 0) : IOException(message)
class WebDavPreconditionFailedException(message: String = "远端文件已被修改 (412 Precondition Failed)") :
    IOException(message)

class WebDavClient(
    private val settings: WebDavSettings,
    private val httpClient: OkHttpClient = defaultClient
) {
    companion object {
        private val defaultClient = OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(20, TimeUnit.SECONDS)
            .writeTimeout(20, TimeUnit.SECONDS)
            .build()
    }

    fun resolveUrl(subPath: String = ""): String {
        val base = settings.serverUrl.trim().replace(Regex("/+$"), "")
        val cleanSub = subPath.trim().replace(Regex("^/+"), "").replace(Regex("/+$"), "")
        return if (cleanSub.isNotEmpty()) "$base/$cleanSub" else base
    }

    private fun addAuth(builder: Request.Builder): Request.Builder {
        if (settings.username.isNotEmpty() || settings.password.isNotEmpty()) {
            val credentials = "${settings.username}:${settings.password}"
            val encoded = Base64.encodeToString(credentials.toByteArray(Charsets.UTF_8), Base64.NO_WRAP)
            builder.header("Authorization", "Basic $encoded")
        }
        return builder
    }

    suspend fun testConnection(): WebDavConnectionTestResult = withContext(Dispatchers.IO) {
        val url = resolveUrl()
        if (url.isEmpty()) {
            return@withContext WebDavConnectionTestResult(false, "服务器地址不能为空")
        }

        try {
            val request = addAuth(
                Request.Builder()
                    .url(url)
                    .method("PROPFIND", null)
                    .header("Depth", "0")
                    .header("Content-Type", "application/xml; charset=utf-8")
            ).build()

            httpClient.newCall(request).execute().use { response ->
                when (response.code) {
                    200, 207 -> WebDavConnectionTestResult(true, "连接成功", response.code)
                    401 -> WebDavConnectionTestResult(false, "用户名或密码错误 (401)", response.code)
                    403 -> WebDavConnectionTestResult(false, "访问被拒绝 (403)", response.code)
                    404 -> WebDavConnectionTestResult(false, "WebDAV 路径不存在 (404)", response.code)
                    else -> WebDavConnectionTestResult(
                        false,
                        "服务器返回状态码 ${response.code}: ${response.message}",
                        response.code
                    )
                }
            }
        } catch (e: Exception) {
            WebDavConnectionTestResult(false, "网络连接失败: ${e.message ?: "未知错误"}")
        }
    }

    suspend fun ensureDir(dirPath: String): Unit = withContext(Dispatchers.IO) {
        val segments = dirPath.trim().replace(Regex("^/+|/+$"), "").split("/").filter { it.isNotEmpty() }
        var current = ""

        for (segment in segments) {
            current = if (current.isNotEmpty()) "$current/$segment" else segment
            val url = resolveUrl(current)

            val checkRequest = addAuth(
                Request.Builder()
                    .url(url)
                    .method("PROPFIND", null)
                    .header("Depth", "0")
            ).build()

            val statusCode = httpClient.newCall(checkRequest).execute().use { it.code }

            if (statusCode == 404) {
                // 目录不存在，执行 MKCOL 创建
                val mkRequest = addAuth(
                    Request.Builder()
                        .url(url)
                        .method("MKCOL", null)
                ).build()

                val mkCode = httpClient.newCall(mkRequest).execute().use { it.code }
                if (mkCode != 201 && mkCode != 200 && mkCode != 405) {
                    throw WebDavException("创建远端目录失败 [$current], 状态码: $mkCode", mkCode)
                }
            } else if (statusCode != 200 && statusCode != 207) {
                throw WebDavException("检查目录失败 [$current], 状态码: $statusCode", statusCode)
            }
        }
    }

    suspend fun getFileMeta(filePath: String): WebDavFileMeta = withContext(Dispatchers.IO) {
        val url = resolveUrl(filePath)
        val request = addAuth(
            Request.Builder()
                .url(url)
                .method("PROPFIND", null)
                .header("Depth", "0")
        ).build()

        httpClient.newCall(request).execute().use { response ->
            if (response.code == 404) {
                return@withContext WebDavFileMeta(exists = false)
            }
            if (response.code != 200 && response.code != 207) {
                throw WebDavException("获取文件元信息失败 [$filePath], 状态码: ${response.code}", response.code)
            }

            val bodyText = response.body?.string().orEmpty()
            var etag = response.header("ETag")
            if (etag.isNullOrEmpty() && bodyText.isNotEmpty()) {
                val match = Regex("<(?:\\w+:)?getetag[^>]*>(.*?)</(?:\\w+:)?getetag>", RegexOption.IGNORE_CASE)
                    .find(bodyText)
                if (match != null) {
                    etag = match.groupValues[1].trim()
                }
            }
            etag = etag?.replace(Regex("^[\"']|[\"']$"), "")

            var lastModified = response.header("Last-Modified")
            if (lastModified.isNullOrEmpty() && bodyText.isNotEmpty()) {
                val match = Regex("<(?:\\w+:)?getlastmodified[^>]*>(.*?)</(?:\\w+:)?getlastmodified>", RegexOption.IGNORE_CASE)
                    .find(bodyText)
                if (match != null) {
                    lastModified = match.groupValues[1].trim()
                }
            }

            val isDirectory = Regex("<(?:\\w+:)?collection\\s*/>", RegexOption.IGNORE_CASE).containsMatchIn(bodyText)

            WebDavFileMeta(
                exists = true,
                etag = etag,
                lastModified = lastModified,
                isDirectory = isDirectory
            )
        }
    }

    suspend fun getFile(filePath: String): Pair<String, String?> = withContext(Dispatchers.IO) {
        val url = resolveUrl(filePath)
        val request = addAuth(
            Request.Builder()
                .url(url)
                .get()
                .header("Accept", "application/json, text/plain, */*")
        ).build()

        httpClient.newCall(request).execute().use { response ->
            if (response.code == 404) {
                throw WebDavException("远端文件不存在 [$filePath]", 404)
            }
            if (!response.isSuccessful) {
                throw WebDavException("下载文件失败 [$filePath], 状态码: ${response.code}", response.code)
            }

            val content = response.body?.string().orEmpty()
            var etag = response.header("ETag")?.replace(Regex("^[\"']|[\"']$"), "")
            Pair(content, etag)
        }
    }

    suspend fun putFile(filePath: String, content: String, ifMatch: String? = null): String? = withContext(Dispatchers.IO) {
        val url = resolveUrl(filePath)
        val body = content.toRequestBody("application/json; charset=utf-8".toMediaType())

        val builder = Request.Builder()
            .url(url)
            .put(body)

        if (!ifMatch.isNullOrEmpty()) {
            val cleanMatch = ifMatch.replace(Regex("^[\"']|[\"']$"), "")
            builder.header("If-Match", "\"$cleanMatch\"")
        }

        val request = addAuth(builder).build()

        httpClient.newCall(request).execute().use { response ->
            if (response.code == 412) {
                throw WebDavPreconditionFailedException()
            }
            if (response.code != 200 && response.code != 201 && response.code != 204) {
                throw WebDavException("上传文件失败 [$filePath], 状态码: ${response.code}", response.code)
            }

            response.header("ETag")?.replace(Regex("^[\"']|[\"']$"), "")
        }
    }
}
