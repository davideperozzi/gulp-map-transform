import { src } from 'gulp';
import flatmap from 'gulp-flatmap';
import path from 'path';
import through from 'through2';
import Vinyl from 'vinyl';
import PluginError from 'plugin-error';

const PLUGIN_NAME = 'gulp-map-transform';

type Transformer = (
  stream: NodeJS.ReadStream
) => NodeJS.ReadWriteStream;

interface TransformedPaths {
  [original: string]: string;
}

interface FileStash {
 [path: string]: FileStashItem;
}

interface FileStashItem {
  match: string;
  virtPath: string;
  realPath: string;
}

interface MapTransformOptions {
  search: RegExp;
  replace: RegExp;
  rewrite: (path: string) => string;
  transform: Transformer;
  rootPath?: string;
  rootPrefix?: string;
}

function scanFile(
  file: Vinyl,
  stash: FileStash,
  options: MapTransformOptions
) {
  if (file.isBuffer()) {
    const content = file.contents.toString('utf8');
    const matches = content.match(options.search);

    if (matches) {
      matches.forEach(match => {
        const filePath = match.match(options.replace);

        if (filePath) {
          stash[filePath[1]] = {
            match,
            virtPath: filePath[1] as string,
            realPath: options.rewrite(filePath[1]),
          };
        }
      });
    }
  }
}

function replacePaths(
  content: string,
  fromPath: string,
  paths: TransformedPaths,
  stash: FileStash,
  search: RegExp,
  rootPath?: string,
  rootPrefix?: string
) {
  for (const p in paths) {
    if (paths.hasOwnProperty(p)) {
      for (const x in stash) {
        if (stash.hasOwnProperty(x)) {
          const item = stash[x];

          if (item.realPath === p) {
            content = content.replace(search, (match) => {
              const prefix = typeof rootPrefix === 'string'
                ? rootPrefix
                : (rootPath  ? '/' : '')

              return match.replace(
                item.virtPath,
                prefix + path.relative(
                  rootPath || path.dirname(fromPath),
                  paths[p]
                )
              );
            });
            break;
          }
        }
      }
    }
  }

  return content;
}

function transformStream(
  transformer: Transformer,
  pathCb: (originalPath: string, transformedPath: string) => void
) {
  return flatmap((stream: NodeJS.ReadStream, file: Vinyl) => {
    const currentPath = path.relative(file.cwd, file.path);

    return transformer(stream)
      .pipe(
        through.obj((transformedFile: Vinyl, _enc: any, cb: any) =>  {
          const transformedPath = path.relative(
            transformedFile.cwd,
            transformedFile.path
          );

          pathCb(currentPath, transformedPath);
          cb();
        })
      );
  });
}

function mapTransform(options: MapTransformOptions) {
  const fileStash: FileStash = {};
  const srcFiles: Vinyl[] = [];

  return through.obj(
    function(file: any, _enc: any, cb: any) {
      // Ensure file is a buffer
      if (file.isStream()) {
        this.emit(
          'error',
          new PluginError(PLUGIN_NAME, 'Streams are not supported!')
        );

        return cb();
      }

      // Push the raw source files for later
      srcFiles.push(file);

      // Scan the file and put all references on a stash.
      // This will treat the path as an id and object key.
      // So duplicates will be sorted out automatically
      scanFile(file, fileStash, options);

      // Immediately continue
      cb();
    },
    function(cb: any) {
      const stashItems = Object.values(fileStash);
      const stashPaths = stashItems.map(s => s.realPath);
      const transformedPaths: TransformedPaths = {};

      // If no transformations for these files are needed
      // just push them back to the stream and do nothing
      if (stashItems.length === 0) {
        srcFiles.forEach(file => this.push(file));
        cb();
        return;
      }

      // Put all files found in a stream and prepare it
      // for the user
      src(stashPaths)
        .pipe(
          // Let the user do stuff with the files and
          // save the output files in an object
          transformStream(
            options.transform,
            (oP, tP) => transformedPaths[oP] = tP
          )
        )
        .on('finish', () => {
          // Replace content in the source files and push
          // them back into the stream
          srcFiles.forEach(file => {
            if (file.isBuffer()) {
              file.contents = Buffer.from(
                replacePaths(
                  file.contents.toString('utf8'),
                  file.path,
                  transformedPaths,
                  fileStash,
                  options.search,
                  options.rootPath,
                  options.rootPrefix
                )
              );
            }

            this.push(file);
          });

          // End the stream after pushing all files back
          cb();
        });
    }
  );
}

export = mapTransform;
