package com.taskorbit.ui

import androidx.compose.ui.graphics.Color
import com.taskorbit.ui.theme.PROJECT_COLOR_MAP
import com.taskorbit.ui.theme.colorToHex
import com.taskorbit.ui.theme.colorToHsv
import com.taskorbit.ui.theme.contrastTextColor
import com.taskorbit.ui.theme.hsvToColor
import com.taskorbit.ui.theme.isPresetProjectColor
import com.taskorbit.ui.theme.normalizeProjectHex
import com.taskorbit.ui.theme.parseHexColor
import com.taskorbit.ui.theme.resolveProjectColor
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ColorUtilsTest {

    @Test
    fun `parseHexColor parses 6-digit hex correctly`() {
        val color = parseHexColor("#FF5722")
        assertNotNull(color)
        assertEquals(1f, color!!.red, 0.01f)
        assertEquals(87f / 255f, color.green, 0.01f)
        assertEquals(34f / 255f, color.blue, 0.01f)

        // Without #
        val colorNoHash = parseHexColor("1D6FBE")
        assertNotNull(colorNoHash)
        assertEquals(Color(0xFF1D6FBE), colorNoHash)
    }

    @Test
    fun `parseHexColor parses 3-digit hex correctly`() {
        val color = parseHexColor("#FFF")
        assertNotNull(color)
        assertEquals(Color(0xFFFFFFFF), color)

        val colorF00 = parseHexColor("F00")
        assertNotNull(colorF00)
        assertEquals(Color(0xFFFF0000), colorF00)
    }

    @Test
    fun `parseHexColor handles invalid input gracefully`() {
        assertNull(parseHexColor(null))
        assertNull(parseHexColor(""))
        assertNull(parseHexColor("   "))
        assertNull(parseHexColor("ZZZZZZ"))
        assertNull(parseHexColor("#12"))
        assertNull(parseHexColor("#12345"))
    }

    @Test
    fun `resolveProjectColor resolves preset keys and custom hex`() {
        // Preset keys
        assertEquals(Color(0xFF6750A4), resolveProjectColor("violet"))
        assertEquals(Color(0xFF3949AB), resolveProjectColor("indigo"))
        assertEquals(Color(0xFF1D6FBE), resolveProjectColor("blue"))

        // Custom hex
        val customColor = resolveProjectColor("#FF5722")
        assertEquals(Color(0xFFFF5722), customColor)

        // Invalid key falls back to fallback
        val fallback = Color(0xFF123456)
        assertEquals(fallback, resolveProjectColor("nonexistent", fallback))
        assertEquals(fallback, resolveProjectColor(null, fallback))
    }

    @Test
    fun `isPresetProjectColor checks map containment`() {
        assertTrue(isPresetProjectColor("violet"))
        assertTrue(isPresetProjectColor("indigo"))
        assertTrue(isPresetProjectColor("teal"))
        assertFalse(isPresetProjectColor("#FF5722"))
        assertFalse(isPresetProjectColor("unknown"))
        assertFalse(isPresetProjectColor(null))
    }

    @Test
    fun `normalizeProjectHex formats correctly`() {
        assertEquals("#ff5722", normalizeProjectHex("#FF5722"))
        assertEquals("#ff5722", normalizeProjectHex("FF5722"))
        assertEquals("#ffffff", normalizeProjectHex("#FFF"))
        assertEquals("#6750a4", normalizeProjectHex("violet"))
    }

    @Test
    fun `contrastTextColor chooses readable foreground`() {
        // Very dark color -> white text
        assertEquals(Color.White, contrastTextColor(Color.Black))
        assertEquals(Color.White, contrastTextColor(Color(0xFF1D1B20)))

        // Very bright color -> dark text
        assertEquals(Color(0xFF1D1B20), contrastTextColor(Color.White))
        assertEquals(Color(0xFF1D1B20), contrastTextColor(Color(0xFFFFEB3B))) // yellow
    }

    @Test
    fun `HSV and RGB roundtrip correctly`() {
        val original = Color(0xFFFF5722)
        val (h, s, v) = colorToHsv(original)
        val reconstructed = hsvToColor(h, s, v)

        assertEquals(original.red, reconstructed.red, 0.02f)
        assertEquals(original.green, reconstructed.green, 0.02f)
        assertEquals(original.blue, reconstructed.blue, 0.02f)
    }

    @Test
    fun `colorToHex formats lowercase hex`() {
        assertEquals("#ff5722", colorToHex(Color(0xFFFF5722)))
        assertEquals("#000000", colorToHex(Color.Black))
        assertEquals("#ffffff", colorToHex(Color.White))
    }
}
