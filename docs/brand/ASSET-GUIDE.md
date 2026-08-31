# Relay production assets

The approved source is [`relay-circular-mark.svg`](./relay-circular-mark.svg). The build script copies its geometry into each production SVG and renders every PNG from those SVGs. Do not trace the mark from `relay-brand-kit.png`. That board guides composition, type, and image choices only.

Run `pnpm brand:build` after changing the approved SVG. Run `pnpm verify:brand-assets` before using or shipping an export.

## Usage

| Asset                           | Dimensions                       | Use                                                       | Treatment                          |
| ------------------------------- | -------------------------------- | --------------------------------------------------------- | ---------------------------------- |
| `mark-black.svg`                | 100 x 100 view box               | Standalone mark on white or pale neutral backgrounds      | Black                              |
| `mark-white.svg`                | 100 x 100 view box               | Standalone mark on true black or dark neutral backgrounds | White                              |
| `mark-accent.svg`               | 100 x 100 view box               | Primary brand mark on true black                          | Acid lime `#C6FF00`                |
| `lockup-black.svg`              | 320 x 100 view box               | Headers, legal pages, and print on light backgrounds      | Black mark and Geist Sans wordmark |
| `lockup-white.svg`              | 320 x 100 view box               | Headers and product chrome on true black                  | White mark and Geist Sans wordmark |
| `lockup-accent.svg`             | 320 x 100 view box               | Campaign and marketing identity on true black             | Acid lime mark and wordmark        |
| `favicon-{size}.png`            | 16, 32, or 64 px square          | Browser and shortcut icons                                | Transparent, acid lime mark        |
| `app-icon-dark-{size}.png`      | 192, 256, 512, or 1024 px square | Dark PWA, Apple touch, install, and app-icon contexts     | Acid lime mark on true black       |
| `app-icon-light-{size}.png`     | 192, 256, 512, or 1024 px square | Light install and app-icon contexts                       | Black mark on acid lime            |
| `social-preview.svg` and `.png` | 1600 x 900                       | Open Graph and large social previews                      | White and acid lime on true black  |

Keep clear space around the standalone mark and lockup equal to 10 percent of the mark's rendered width. The app icons include 14 percent inset space. Keep social-preview text and marks inside its existing 170-pixel safe area.

The minimum supported mark and favicon size is 16 x 16 pixels. Do not render the lockup below 96 pixels wide. App icons start at 192 pixels, and the social preview must stay at 1600 x 900. Use an SVG above 16 pixels when the consumer accepts it. Do not recolor, stretch, rotate, animate, outline, or add effects to the mark. Reserve acid lime for identity, primary actions, current status, and final handoff. Use zinc `#71717A` only for supporting rules or secondary text.

The same generated files live in `public/brand/relay` and `website/public/brand/relay` because the app and marketing site build separately. The build script keeps both copies identical.

## Runtime adoption

Ticket 01 does not switch runtime branding. Ticket 03 will map the marketing favicon and 1600 x 900 social metadata to this pack. Ticket 04 will map the app's 32 and 64 pixel browser icons, 256 pixel Apple icon, and 192, 512, and 1024 pixel manifest icons. Until then, verification checks both the current references and the prepared Relay files.
