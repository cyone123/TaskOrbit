use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use reqwest::Method;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::str::FromStr;
use std::time::Duration;

#[derive(Deserialize)]
pub struct HttpRequestOptions {
    pub url: String,
    pub method: String,
    pub headers: Option<HashMap<String, String>>,
    pub body: Option<String>,
    #[serde(rename = "timeoutMs")]
    pub timeout_ms: Option<u64>,
}

#[derive(Serialize)]
pub struct HttpResponseResult {
    pub status: u16,
    #[serde(rename = "statusText")]
    pub status_text: Option<String>,
    pub headers: HashMap<String, String>,
    pub body: String,
}

#[tauri::command]
pub async fn webdav_request(options: HttpRequestOptions) -> Result<HttpResponseResult, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_millis(options.timeout_ms.unwrap_or(15_000)))
        .build()
        .map_err(|e| format!("failed to build http client: {e}"))?;

    let method = Method::from_str(&options.method.to_uppercase())
        .map_err(|e| format!("invalid http method: {e}"))?;

    let mut headers = HeaderMap::new();
    if let Some(user_headers) = options.headers {
        for (k, v) in user_headers {
            if let (Ok(name), Ok(val)) = (HeaderName::from_str(&k), HeaderValue::from_str(&v)) {
                headers.insert(name, val);
            }
        }
    }

    let mut req = client.request(method, &options.url).headers(headers);
    if let Some(body) = options.body {
        req = req.body(body);
    }

    let resp = req
        .send()
        .await
        .map_err(|e| format!("request failed: {e}"))?;

    let status = resp.status().as_u16();
    let status_text = resp.status().canonical_reason().map(|s| s.to_string());

    let mut resp_headers = HashMap::new();
    for (k, v) in resp.headers() {
        if let Ok(val_str) = v.to_str() {
            resp_headers.insert(k.as_str().to_string(), val_str.to_string());
        }
    }

    let body = resp
        .text()
        .await
        .map_err(|e| format!("failed to read response body: {e}"))?;

    Ok(HttpResponseResult {
        status,
        status_text,
        headers: resp_headers,
        body,
    })
}
