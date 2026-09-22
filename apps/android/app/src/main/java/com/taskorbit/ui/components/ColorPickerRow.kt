package com.taskorbit.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.taskorbit.ui.theme.PROJECT_COLOR_MAP
import com.taskorbit.ui.theme.ShapeTokens

@Composable
fun ColorPickerRow(
    selectedColor: String,
    onColorSelected: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val scrollState = rememberScrollState()

    Row(
        modifier = modifier
            .fillMaxWidth()
            .horizontalScroll(scrollState)
            .padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
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
                    .clickable { onColorSelected(colorKey) },
                contentAlignment = Alignment.Center
            ) {
                if (isSelected) {
                    Icon(
                        imageVector = Icons.Filled.Check,
                        contentDescription = "已选择 $colorKey",
                        tint = Color.White,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        }
    }
}
