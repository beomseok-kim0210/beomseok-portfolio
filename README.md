# Beomseok Portfolio

## Video CDN Environment Variables

Large full-length portfolio videos are not committed to GitHub because they exceed GitHub's 100MB single-file limit.

Production deployments must define these variables in Vercel Settings -> Environment Variables:

```env
NEXT_PUBLIC_ARMI_FULL_VIDEO=https://beomdda.sirv.com/video/ARMI_video_portfolio.mp4
NEXT_PUBLIC_HANGARAE_FULL_VIDEO=https://beomdda.sirv.com/video/%ED%96%89%EA%B0%80%EB%9E%98_video_fortpolio.mp4
```

The local files below remain ignored and should be served through the CDN instead:

- `public/videos/ARMI_video_portfolio.mp4`
- `public/videos/행가래_video_fortpolio.mp4`
