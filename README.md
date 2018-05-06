# JSBox

JSBox Development Utilities on VSCode!

This is a VSCode extension for [JSBox](https://docs.xteko.com), it provides useful features like `syntax highlighting`, `auto completion` etc.

The most important is, when you save a script on VSCode, it runs on your iPhone automatically!

## Extension Settings

Note: Make sure your iPhone and computer are on the same Wi-Fi.

On iPhone, turn on debug mode of JSBox and restart the app, you can see the `Host` in the settings view.

On VSCode, you need to set `jsBox.host`:

* `JSBox configuration` -> `jsBox.host`: web server host

There are also two super easy ways to setup host:

- Click menu button at the top-right corner of your editor panel, there's a `Set Host` item
- Trigger VSCode command with `command+shift+p`, type sethost then execute the command

If you don't want to sync source file automatically, you can set `jsBox.autoUpload` to `false`.

## Don't like VSCode?

Try [jsbox-cli](https://github.com/Dreamacro/jsbox-cli)! This is a cli tool which is made by [Dreamacro](https://github.com/Dreamacro).

## Contacts

- [GitHub](https://github.com/cyanzhong/vscode-jsbox)
- [Docs](https://docs.xteko.com)
- [Email](mailto:log.e@qq.com)

## Release Notes

### 0.1.0

Initial release
