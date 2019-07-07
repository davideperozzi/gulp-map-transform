import gulp from 'gulp';
import mapTransform from '../src';
import path from 'path';
import File from 'vinyl';
import rimraf from 'rimraf';
import through from 'through2';
import fs from 'fs';

describe('map-transform', () => {
  const dataDir = path.resolve(__dirname, 'data');
  const cacheDir = path.resolve(__dirname, '.cache');
  const inputFiles = path.join(dataDir, '/**/*.html');

  const cleanCache = () => rimraf.sync(cacheDir);

  beforeAll(() => cleanCache());
  afterEach(() => cleanCache());

  it('should transform css paths inside a html file', (done) => {
    gulp.src(inputFiles)
      .pipe(
        mapTransform({
          rootPath: cacheDir,
          search: /href="@styles\/(.*?).css"/gi,
          replace: /"(.*?)"/i,
          rewrite: (p) => p.replace('@styles', 'tests/data/styles'),
          transform: (stream) => {
            return stream
              .pipe(
                through.obj(function(file: File, _enc, cb) {
                  expect(file.basename).toBe('test.css');
                  this.push(file);
                  cb();
                })
              )
              .pipe(gulp.dest(cacheDir));
          }
        })
      )
      .pipe(
        through.obj(function(file: File, _enc, cb) {
          expect(file.isBuffer()).toBeTruthy();

          if (file.isBuffer()) {
            const content = file.contents.toString('utf8');

            expect(/href="\/test.css"/.test(content)).toBeTruthy();
          }

          this.push(file);

          cb();
        })
      )
      .pipe(gulp.dest(cacheDir))
      .on('end', () => {
        expect(fs.existsSync(path.join(cacheDir, 'index.html'))).toBeTruthy();
        expect(fs.existsSync(path.join(cacheDir, 'test.css'))).toBeTruthy();
        done();
      });
  });
});
