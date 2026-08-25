# Curated SVG Library Audit

## Scope and method

This audit covers `src/assets/icons/flaticon/Curated_Redux_Resorted_Standardized/`.
Every SVG was rasterized locally, placed on a transparent normalized canvas, cropped
to its visible artwork, and compared using both an RGBA pixel hash and a small
perceptual signature. Filenames were not used to decide whether artwork was a
duplicate.

## Duplicate review

### High-confidence duplicates removed

- 294 exact rendered-artwork groups were found.
- 305 redundant SVG files were removed.
- One canonical SVG was retained per group.
- Canonical selection preferred a clean non-`copy` filename, an established
  subject category instead of `Misc`, and the lowest sensible sequence number.
- The post-cleanup normalized visual comparison reports **zero exact duplicate
  groups**.

Removed redundant files by retained canonical top-level category:

| Canonical category        | Redundant files removed |
| ------------------------- | ----------------------: |
| Activities                |                       6 |
| Animals                   |                      16 |
| Clothing & Accessories    |                       5 |
| Culture & Holidays        |                       2 |
| Fantasy                   |                       1 |
| Food & Kitchen            |                      18 |
| Misc                      |                       4 |
| Objects & Tools           |                       5 |
| People                    |                     110 |
| Places & Environments     |                      34 |
| School & Work             |                      11 |
| Therapy & Visual Supports |                      84 |
| Transportation & Travel   |                       9 |

Representative exact rendered duplicates included `toy04`/`toy06`,
`butterfly03`/`butterfly09`, `dress03`/`dress05`, repeated people variants,
and repeated speech/thought-bubble variants. Cross-category duplicates were
retained in the visually appropriate existing category, for example animal,
food, activity, fantasy, home, or safety categories as applicable.

### Possible duplicates retained for review

The following pair is similar but was **not** removed because the comparison was
not an exact visual match:

- `People/extroversion01.svg`
- `People/introversion01.svg`

## Category audit

Before this pass, the top-level library contained the following broad categories
plus an opaque `svg/` imported holding area:

- Activities
- Animals
- Clothing & Accessories
- Culture & Holidays
- Fantasy
- Food & Kitchen
- Misc
- Nature & Weather
- Objects & Tools
- People
- Places & Environments
- School & Work
- Therapy & Visual Supports
- Transportation & Travel

After this pass, the broad categories are unchanged, with `svg/` reclassified as
`Unsure & Unsorted`:

- Activities
- Animals
- Clothing & Accessories
- Culture & Holidays
- Fantasy
- Food & Kitchen
- Misc
- Nature & Weather
- Objects & Tools
- People
- Places & Environments
- School & Work
- Therapy & Visual Supports
- Transportation & Travel
- Unsure & Unsorted

The opaque imported holding area was moved to:

`src/assets/icons/flaticon/Curated_Redux_Resorted_Standardized/Unsure & Unsorted/`

It contains imported material that needs individual visual curation rather than
being mixed into therapist-facing categories. No artwork or SVG contents were
changed during that move. Thirty-eight files were relocated with that folder;
no individual filenames were renamed.

## Unresolved assets

Twenty-four SVGs did not produce visible artwork in the local raster pass and
were intentionally retained. They are:

- `Therapy & Visual Supports/Symbols & Communication/weight02.svg`
- 23 imported `image01.svg`–`image23.svg` files in
  `Unsure & Unsorted/one_converted_to_svg/`

These need manual source/visual review before categorization or removal.

## Compatibility and verification

Asset discovery uses a filesystem glob rather than hard-coded asset paths.
The existing compatibility metadata was regenerated after cleanup so legacy
aliases resolve to retained canonical files where possible.

Checks completed:

- Normalized raster comparison before and after cleanup
- Full post-cleanup SVG count
- Compatibility metadata generation
- Static diff integrity check

No new artwork was added. No possible or visually distinct duplicate was
removed.
