# P5.5 Jammer cover integration

P5.5 takes the approved Jammer promotional artwork and makes it part of the extension itself.

## Source asset

Repository path:

```text
assets/brand/jammer-cover.webp
```

The packaged image is an optimized WebP derived from the approved Jammer cover artwork.

Dimensions:

```text
1200 × 764
```

Approximate repository size:

```text
< 40 KiB
```

## Runtime placement

The Options page displays the cover directly below the Jammer header.

It is packaged locally as:

```text
assets/jammer-cover.webp
```

in both development and product builds.

The image is never fetched remotely.

## Layout

Desktop:
- responsive wide cover
- 16:7 presentation crop
- local object-fit rendering

Narrow/mobile-sized Options:
- 16:9 presentation crop

The full source image remains untouched in the repository asset; cropping is presentation-only CSS.

## Release gate

The release audit now requires:

- the packaged WebP to exist
- a valid RIFF/WebP signature
- cover size below 250 KiB
- inclusion inside the final Chromium ZIP

## Product identity

Product version:

```text
0.6.0
```

Build marker:

```text
p55-cover-integration-product
```
