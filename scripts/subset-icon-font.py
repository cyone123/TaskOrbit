"""Build and validate the font; invoked by generate-icon-font.mjs."""
import json
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

directory = Path(sys.argv[1])
names = json.loads((directory / "icons.json").read_text(encoding="utf-8"))
codepoints = dict(line.split() for line in (directory / "codepoints").read_text().splitlines())
missing = set(names) - codepoints.keys()
if missing:
    raise ValueError(f"Unknown Material Symbols: {sorted(missing)}")

font = TTFont(directory / "source.ttf")
unicodes = {int(codepoints[name], 16) for name in names}
unicodes.update(ord(character) for name in names for character in name)
options = subset.Options()
options.flavor = "woff2"
options.layout_features = ["*"]
# Ligature closure over ASCII would pull every icon back into the subset.
options.layout_closure = False
subsetter = subset.Subsetter(options=options)
subsetter.populate(unicodes=unicodes)
subsetter.subset(font)
font = instantiateVariableFont(font, {"wght": 500, "GRAD": 0}, inplace=True)
font.flavor = "woff2"
destination = directory / "material-symbols-rounded.woff2"
font.save(destination)

# Verify the emitted file, including every name-to-icon ligature and both axes.
with TTFont(destination) as result:
    cmap = result.getBestCmap()
    ligatures = {}
    for lookup in result["GSUB"].table.LookupList.Lookup:
        for subtable in lookup.SubTable:
            lookup_type = lookup.LookupType
            table = subtable
            if lookup_type == 7:
                lookup_type = subtable.ExtensionLookupType
                table = subtable.ExtSubTable
            if lookup_type == 4:
                for first, entries in table.ligatures.items():
                    for entry in entries:
                        ligatures[(first, *entry.Component)] = entry.LigGlyph
    for name in names:
        sequence = tuple(cmap[ord(character)] for character in name)
        assert ligatures.get(sequence) == cmap[int(codepoints[name], 16)], name
    axes = {axis.axisTag: (axis.minValue, axis.maxValue) for axis in result["fvar"].axes}
    assert axes == {"FILL": (0, 1), "opsz": (20, 48)}, axes
