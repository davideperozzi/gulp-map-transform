# gulp-map-transform

[![Version](https://flat.badgen.net/npm/v/gulp-map-transform)](https://www.npmjs.com/package/gulp-map-transform)
[![CircleCI](https://flat.badgen.net/circleci/github/davideperozzi/gulp-map-transform/master)](https://circleci.com/gh/davideperozzi/gulp-map-transform/tree/master)
[![License](https://flat.badgen.net/badge/license/MIT/blue)](./LICENSE)

Easily transform virtual paths inside any file to real paths

## Install

Install via npm:
```sh
npm install --save-dev gulp-map-transform
```

## Usage

### Transforming scss paths to compiled css paths

Given this section of a html file:

```html
...
<head>
  <link rel="stylesheet" href="@styles/test.scss" />
</head>
...
```

And this configuration inside your gulpfile

```js
const { src, dest } = require('gulp');
const sass = require('gulp-sass');
const mapTransform = require('gulp-map-transform');

const OUT_PATH = '/dist/folder';

src('/html/files/**/*.html')
  .pipe(
    mapTransform({
      search: /href="@styles\/(.*?).scss"/gi,
      replace: /"(.*?)"/i,
      rootPath: OUT_PATH,
      rewrite: (path) => path.replace('@styles', 'css/files'),
      transform: (stream) => stream
        .pipe(sass())
        .pipe(dest(path.join(OUT_PATH, 'css')))
    })
  )
  .pipe(dest(OUT_PATH))
```

This will generate the following html file after compiling the css file:
```html
...
<head>
  <link rel="stylesheet" href="/css/files/test.css" />
</head>
...
```

## Options
| Name | Type |  Required | Description
| -- | -- | -- | --
| search | `RegExp` | yes | This expression is used to identify in which location you want to execute a transformation of the content
| replace | `RegExp` | yes | This is used to replace the path of the file inside a result of the search matches
| rewrite | Function | yes | Use this to tell what and how to replace the path inside the string found by the replace expression
| transform | Function | yes | In this callback you get a separate stream to handle all your files already present with the real path
| rootPath | string | no | The root path to which the transfomed file paths will be appended (with `path.relative()`)

## License
See the [LICENSE](./LICENSE) file for license rights and limitations (MIT).