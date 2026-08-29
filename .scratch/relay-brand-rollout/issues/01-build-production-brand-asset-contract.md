# 01: Build the production brand asset contract

**What to build:** Turn the approved circular Relay mark into the small production asset set needed by the marketing site and app. Keep the approved vector as the sole geometry source. Add a horizontal Relay lockup, favicons, app icons, and one social preview image. Document each asset's intended use and make every raster export repeatable. This ticket prepares the assets but does not restyle the live marketing site or app.

**Blocked by:** None. Can start immediately.

**Status:** complete

- [x] The approved circular vector remains the sole source of mark geometry.
- [x] The asset set includes the standalone mark and a horizontal Relay lockup for black-on-white and white-on-black use.
- [x] The asset set includes the favicon sizes, app-icon sizes, and social preview image required by the current marketing and app manifests and metadata.
- [x] Raster exports come from the approved vector through an existing tool or platform feature. No new image dependency is added unless the current toolchain cannot produce a correct export.
- [x] Asset guidance states the intended use, dimensions, clear space, minimum supported size, and light or dark treatment for each asset.
- [x] The brand-kit overview remains visual guidance and is not used as a source for traced logo geometry.
- [x] An automated check validates the vector, expected view box, raster dimensions, required files, and loadable outputs.
- [x] Browser or rendered-image evidence confirms that the negative-space cut stays distinct at 16 pixels and that the mark works on true black and white.
- [x] Existing runtime branding remains unchanged except where a reference must exist to verify that an asset can load.
- [x] All checks introduced or used by this ticket pass.
