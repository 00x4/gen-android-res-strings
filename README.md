# gen-android-res-strings

Generate Android app resource strings from YAML using a Deno single-file script.

## Install

- Copy the script to a local file
- Or clone this repository

## Usage

### Prepare your YAML file

```yaml
resources:
  hello:
    _: "Hello!"
    ja: "こんにちは！"
  file_count:
    _:
      one: "You have %1$d file."
      other: "You have %1$d files."
    ja:
      other: "ファイルが %1$d 個あります。"
```

- `resources` is the root key for all resources.
- Each resource key (e.g., `hello`, `file_count`) can have a default value (`_`) and optional language-specific values (e.g., `ja` for Japanese).
- Resource keys with child elements for plurals (e.g., `one`, `other`) are treated as Plurals.

You can optionally add a `config` section to specify a key prefix:

```yaml
config:
  key_prefix: "my_prefix_"
resources:
  hello:
    _: "Hello!"
    ja: "こんにちは！"
```

- `config.key_prefix` is prepended to every resource key in the generated XML (e.g., `my_prefix_hello`).
- `config` and `key_prefix` are both optional. If omitted, keys are used as-is.

### Run the script

```sh
deno run --allow-read --allow-write \
  gen-android-res-strings.deno.ts \
  <path-to.yaml> \
  <path-to-res-dir>

# e.g.
# deno run --allow-read --allow-write \
#   gen-android-res-strings.deno.ts \
#   ./strings.yaml \
#   ./androidApp/src/main/res
```

If the execution is successful, the following XML files will be generated.

> [!WARNING]
> The file will be overwritten if it already exists.

```xml
<!-- res/values/strings.xml -->

<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="hello">Hello!</string>
    <plurals name="file_count">
        <item quantity="one">You have %1$d file.</item>
        <item quantity="other">You have %1$d files.</item>
    </plurals>
</resources>
```

```xml
<!-- res/values-ja/strings.xml -->

<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="hello">こんにちは！</string>
    <plurals name="file_count">
        <item quantity="other">ファイルが %1$d 個あります。</item>
    </plurals>
</resources>
```

## License

MIT
