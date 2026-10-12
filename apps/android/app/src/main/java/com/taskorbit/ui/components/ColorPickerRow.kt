package com.taskorbit.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.outlined.Palette
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.taskorbit.ui.theme.PROJECT_COLOR_MAP
import com.taskorbit.ui.theme.ShapeTokens
import com.taskorbit.ui.theme.bouncyClickable
import com.taskorbit.ui.theme.colorToHex
import com.taskorbit.ui.theme.colorToHsv
import com.taskorbit.ui.theme.contrastTextColor
import com.taskorbit.ui.theme.hsvToColor
import com.taskorbit.ui.theme.isPresetProjectColor
import com.taskorbit.ui.theme.parseHexColor
import com.taskorbit.ui.theme.resolveProjectColor
import java.util.Locale

private val QUICK_SWATCHES = listOf(
    "#EF4444", "#F97316", "#F59E0B", "#10B981", "#14B8A6",
    "#06B6D4", "#3B82F6", "#6366F1", "#8B5CF6", "#EC4899",
    "#64748B", "#1E293B"
)

private val HUE_GRADIENT_COLORS = listOf(
    Color(0xFFFF0000),
    Color(0xFFFFFF00),
    Color(0xFF00FF00),
    Color(0xFF00FFFF),
    Color(0xFF0000FF),
    Color(0xFFFF00FF),
    Color(0xFFFF0000)
)

@Composable
fun ColorPickerRow(
    selectedColor: String,
    onColorSelected: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val scrollState = rememberScrollState()
    val isCustomSelected = !isPresetProjectColor(selectedColor)
    val activeCustomColor = resolveProjectColor(selectedColor, Color(0xFF6750A4))

    var isCustomPanelExpanded by remember { mutableStateOf(false) }

    var hue by remember { mutableFloatStateOf(0f) }
    var saturation by remember { mutableFloatStateOf(1f) }
    var value by remember { mutableFloatStateOf(1f) }
    var hexInput by remember { mutableStateOf("") }

    // 当选中颜色变更且为自定义颜色时，同步 HSV 与 Hex 输入
    LaunchedEffect(selectedColor) {
        if (isCustomSelected) {
            val col = resolveProjectColor(selectedColor)
            val (h, s, v) = colorToHsv(col)
            hue = h
            saturation = s
            value = v
            hexInput = selectedColor.removePrefix("#").uppercase(Locale.ROOT)
        }
    }

    Column(modifier = modifier.fillMaxWidth()) {
        // 预设颜色与调色盘入口行
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(scrollState)
                .padding(vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // 预设主题色圆点
            PROJECT_COLOR_MAP.forEach { (colorKey, colorVal) ->
                val isSelected = colorKey == selectedColor
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .clip(ShapeTokens.Full)
                        .background(colorVal)
                        .then(
                            if (isSelected) {
                                Modifier.border(
                                    width = 3.dp,
                                    color = MaterialTheme.colorScheme.onSurface,
                                    shape = ShapeTokens.Full
                                )
                            } else Modifier
                        )
                        .bouncyClickable {
                            onColorSelected(colorKey)
                            isCustomPanelExpanded = false
                        },
                    contentAlignment = Alignment.Center
                ) {
                    if (isSelected) {
                        Icon(
                            imageVector = Icons.Filled.Check,
                            contentDescription = "已选择 $colorKey",
                            tint = contrastTextColor(colorVal),
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
            }

            // 自定义调色盘按钮（对齐桌面端调色盘入口）
            val paletteBg = if (isCustomSelected) activeCustomColor else MaterialTheme.colorScheme.surfaceContainerHigh
            val paletteTint = if (isCustomSelected) contrastTextColor(activeCustomColor) else MaterialTheme.colorScheme.onSurfaceVariant
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(ShapeTokens.Full)
                    .background(paletteBg)
                    .then(
                        if (isCustomSelected) {
                            Modifier.border(
                                width = 3.dp,
                                color = MaterialTheme.colorScheme.onSurface,
                                shape = ShapeTokens.Full
                            )
                        } else {
                            Modifier.border(
                                width = 1.dp,
                                color = MaterialTheme.colorScheme.outlineVariant,
                                shape = ShapeTokens.Full
                            )
                        }
                    )
                    .bouncyClickable {
                        if (!isCustomSelected) {
                            val initHex = colorToHex(resolveProjectColor(selectedColor))
                            onColorSelected(initHex)
                            isCustomPanelExpanded = true
                        } else {
                            isCustomPanelExpanded = !isCustomPanelExpanded
                        }
                    },
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Outlined.Palette,
                    contentDescription = if (isCustomSelected) "当前自定义颜色 ${selectedColor.uppercase(Locale.ROOT)}" else "自定义调色盘",
                    tint = paletteTint,
                    modifier = Modifier.size(20.dp)
                )
            }
        }

        // 自定义调色盘展开区域
        AnimatedVisibility(
            visible = isCustomPanelExpanded,
            enter = fadeIn() + expandVertically(),
            exit = fadeOut() + shrinkVertically()
        ) {
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 4.dp, bottom = 8.dp),
                shape = ShapeTokens.Large,
                color = MaterialTheme.colorScheme.surfaceContainer,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    // 顶部栏：颜色预览色块、HEX 代码输入框与完成按钮
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(44.dp)
                                .clip(ShapeTokens.Medium)
                                .background(activeCustomColor)
                                .border(1.dp, MaterialTheme.colorScheme.outlineVariant, ShapeTokens.Medium),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Outlined.Palette,
                                contentDescription = null,
                                tint = contrastTextColor(activeCustomColor),
                                modifier = Modifier.size(20.dp)
                            )
                        }

                        OutlinedTextField(
                            value = hexInput,
                            onValueChange = { input ->
                                val clean = input.removePrefix("#")
                                    .filter { it.isDigit() || it in 'a'..'f' || it in 'A'..'F' }
                                    .take(6)
                                    .uppercase(Locale.ROOT)
                                hexInput = clean
                                if (clean.length == 6) {
                                    val parsed = parseHexColor("#$clean")
                                    if (parsed != null) {
                                        val (h, s, v) = colorToHsv(parsed)
                                        hue = h
                                        saturation = s
                                        value = v
                                        onColorSelected("#${clean.lowercase(Locale.ROOT)}")
                                    }
                                }
                            },
                            label = { Text("HEX 代码") },
                            prefix = { Text("#", style = MaterialTheme.typography.bodyLarge) },
                            singleLine = true,
                            textStyle = MaterialTheme.typography.bodyLarge.copy(
                                fontFamily = FontFamily.Monospace,
                                fontWeight = FontWeight.Medium
                            ),
                            modifier = Modifier.weight(1f)
                        )

                        TaskOrbitButton(
                            text = "收起",
                            variant = ButtonVariant.TONAL,
                            onClick = { isCustomPanelExpanded = false }
                        )
                    }

                    // 1. 色相调节 (Hue)
                    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("色相", style = MaterialTheme.typography.labelMedium)
                            Text(
                                "${hue.toInt()}°",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(36.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(10.dp)
                                    .clip(ShapeTokens.Full)
                                    .background(Brush.horizontalGradient(HUE_GRADIENT_COLORS))
                            )
                            Slider(
                                value = hue,
                                onValueChange = { newHue ->
                                    hue = newHue
                                    val col = hsvToColor(newHue, saturation, value)
                                    val hex = colorToHex(col)
                                    hexInput = hex.removePrefix("#").uppercase(Locale.ROOT)
                                    onColorSelected(hex)
                                },
                                valueRange = 0f..360f,
                                colors = SliderDefaults.colors(
                                    thumbColor = hsvToColor(hue, 1f, 1f),
                                    activeTrackColor = Color.Transparent,
                                    inactiveTrackColor = Color.Transparent
                                ),
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    }

                    // 2. 饱和度调节 (Saturation)
                    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("饱和度", style = MaterialTheme.typography.labelMedium)
                            Text(
                                "${(saturation * 100).toInt()}%",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(36.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(10.dp)
                                    .clip(ShapeTokens.Full)
                                    .background(
                                        Brush.horizontalGradient(
                                            listOf(
                                                hsvToColor(hue, 0f, value),
                                                hsvToColor(hue, 1f, value)
                                            )
                                        )
                                    )
                            )
                            Slider(
                                value = saturation,
                                onValueChange = { newSat ->
                                    saturation = newSat
                                    val col = hsvToColor(hue, newSat, value)
                                    val hex = colorToHex(col)
                                    hexInput = hex.removePrefix("#").uppercase(Locale.ROOT)
                                    onColorSelected(hex)
                                },
                                valueRange = 0f..1f,
                                colors = SliderDefaults.colors(
                                    thumbColor = hsvToColor(hue, saturation, value),
                                    activeTrackColor = Color.Transparent,
                                    inactiveTrackColor = Color.Transparent
                                ),
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    }

                    // 3. 明度调节 (Value / Brightness)
                    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("明度", style = MaterialTheme.typography.labelMedium)
                            Text(
                                "${(value * 100).toInt()}%",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(36.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(10.dp)
                                    .clip(ShapeTokens.Full)
                                    .background(
                                        Brush.horizontalGradient(
                                            listOf(
                                                Color.Black,
                                                hsvToColor(hue, saturation, 1f)
                                            )
                                        )
                                    )
                            )
                            Slider(
                                value = value,
                                onValueChange = { newVal ->
                                    value = newVal
                                    val col = hsvToColor(hue, saturation, newVal)
                                    val hex = colorToHex(col)
                                    hexInput = hex.removePrefix("#").uppercase(Locale.ROOT)
                                    onColorSelected(hex)
                                },
                                valueRange = 0f..1f,
                                colors = SliderDefaults.colors(
                                    thumbColor = hsvToColor(hue, saturation, value),
                                    activeTrackColor = Color.Transparent,
                                    inactiveTrackColor = Color.Transparent
                                ),
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    }

                    // 推荐调色板
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(
                            text = "推荐配色",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        LazyRow(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            items(QUICK_SWATCHES) { swatchHex ->
                                val swatchColor = parseHexColor(swatchHex) ?: Color.Gray
                                val isSelectedSwatch = selectedColor.equals(swatchHex, ignoreCase = true)
                                Box(
                                    modifier = Modifier
                                        .size(32.dp)
                                        .clip(ShapeTokens.Full)
                                        .background(swatchColor)
                                        .then(
                                            if (isSelectedSwatch) {
                                                Modifier.border(
                                                    width = 2.5.dp,
                                                    color = MaterialTheme.colorScheme.onSurface,
                                                    shape = ShapeTokens.Full
                                                )
                                            } else {
                                                Modifier.border(
                                                    width = 1.dp,
                                                    color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f),
                                                    shape = ShapeTokens.Full
                                                )
                                            }
                                        )
                                        .bouncyClickable {
                                            val (h, s, v) = colorToHsv(swatchColor)
                                            hue = h
                                            saturation = s
                                            value = v
                                            hexInput = swatchHex.removePrefix("#").uppercase(Locale.ROOT)
                                            onColorSelected(swatchHex.lowercase(Locale.ROOT))
                                        },
                                    contentAlignment = Alignment.Center
                                ) {
                                    if (isSelectedSwatch) {
                                        Icon(
                                            imageVector = Icons.Filled.Check,
                                            contentDescription = null,
                                            tint = contrastTextColor(swatchColor),
                                            modifier = Modifier.size(16.dp)
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
