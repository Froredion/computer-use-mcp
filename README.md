# computer-use-mcp

💻 A Model Context Protocol server for Claude to control your computer. This is very similar to [computer use](https://docs.anthropic.com/en/docs/build-with-claude/computer-use), but easy to set up and use locally.

> [!NOTE]
> This is a fork of [domdomegg/computer-use-mcp](https://github.com/domdomegg/computer-use-mcp) with fixes for Windows:
> - **Screenshots fall back to a native Windows capture.** Upstream's only fallback when nut.js can't grab the screen is macOS's `screencapture`, so on Windows any capture failure surfaced as a confusing `spawnSync screencapture ENOENT`. Windows now falls back to PowerShell + System.Drawing, and if that fails too the error says why.
> - **Clicks line up under Windows display scaling.** Screenshots are sized from the logical screen size rather than the physical capture, which previously put clicks and the cursor crosshair in the wrong place on setups like a 1920x1080 display at 150% scaling.

Here's Claude Haiku 4.5 changing my desktop background (4x speed):

https://github.com/user-attachments/assets/cd0bc190-52c4-49db-b3bc-4b8a74544789

> [!WARNING]
> At time of writing, models make frequent mistakes and are vulnerable to prompt injections. As this MCP server gives the model complete control of your computer, this could do a lot of damage. You should therefore treat this like giving a hyperactive toddler access to your computer - you probably want to supervise it closely, and consider only doing this in a sandboxed user account.

## Installation

This fork isn't published to npm (`npx computer-use-mcp` installs the upstream package), so build it from source:

```sh
git clone https://github.com/Froredion/computer-use-mcp.git
cd computer-use-mcp
npm install
npm run build
```

Then point your MCP client at `dist/main.js`. For Claude Code:

```sh
claude mcp add computer-use -- node /absolute/path/to/computer-use-mcp/dist/main.js
```

For Claude Desktop, Cursor and other clients that use JSON config:

```json
{
  "mcpServers": {
    "computer-use": {
      "command": "node",
      "args": ["C:\\absolute\\path\\to\\computer-use-mcp\\dist\\main.js"]
    }
  }
}
```

Tagged releases also attach a `computer-use-mcp.mcpb` bundle, which Claude Desktop can install directly.

## Tips

This should just work out of the box.

However, to get best results:
- Use a model good at computer use - I recommend [the latest Claude models](https://platform.claude.com/docs/en/about-claude/models/overview).
- Use a small, common resolution - 720p works particularly well. On macOS, you can use [displayoverride-mac](https://github.com/domdomegg/displayoverride-mac) to do this. If you can't use a different resolution, try zooming in to active windows.
- Install and enable the [Rango browser extension](https://chromewebstore.google.com/detail/rango/lnemjdnjjofijemhdogofbpcedhgcpmb). This enables keyboard navigation for websites, which is far more reliable than Claude trying to click coordinates. You can bump up the font size setting in Rango to make the hints more visible.

## How it works

We implement a near identical computer use tool to [Anthropic's official computer use guide](https://docs.anthropic.com/en/docs/build-with-claude/computer-use), with some more nudging to prefer keyboard shortcuts.

This talks to your computer using [nut.js](https://github.com/nut-tree/nut.js)

## Contributing

Pull requests are welcomed on GitHub! To get started:

1. Install Git and Node.js
2. Clone the repository
3. Install dependencies with `npm install`
4. Run `npm run test` to run tests
5. Build with `npm run build`

## Releases

Versions follow the [semantic versioning spec](https://semver.org/).

To release:

1. Use `npm version <major | minor | patch>` to bump the version
2. Run `git push --follow-tags` to push with tags
3. Wait for GitHub Actions to create a GitHub Release with the MCPB bundle attached.

To pull in upstream changes: `git fetch upstream && git merge upstream/master`.
