const rollup = require('rollup').rollup;
const resolve = require('rollup-plugin-node-resolve');

const gulp = require('gulp');
const packages = require('/www/package.json');
const $ = require('gulp-load-plugins')({
  config: packages
});
const browserSync = require('browser-sync').create();
const nunjucks = require('nunjucks');
const path = require('path');

let sourcemapsDest = 'sourcemaps';
let libName = 'tiny-slider',
    testName = 'script',
    modulePostfix = '.module',
    helperIEPostfix = '.helper.ie8',
    script = libName + '.js',
    moduleScript = libName + modulePostfix + '.js',
    helperIEScript = libName + helperIEPostfix + '.js',
    testScript = testName + '.js',
    sassFile = libName + '.scss',
    pathSrc = 'src/',
    pathDest = 'dist/',
    pathTest = 'tests/js/',
    scriptSources = [pathSrc + '**/*.js', '!' + pathSrc + moduleScript, '!' + pathSrc + helperIEScript];

function errorlog (error) {  
  console.error.bind(error);  
  this.emit('end');  
}  

function sassTask(src, dest) {
  return gulp.src(src)
    .pipe($.sourcemaps.init())
    .pipe($.sass({
      outputStyle: 'compressed', 
      precision: 7
    }).on('error', $.sass.logError))  
    .pipe($.sourcemaps.write(sourcemapsDest))
    .pipe(gulp.dest(dest))
    .pipe(browserSync.stream());
}

// SASS Task
gulp.task('sass', function () {  
  sassTask(pathSrc + sassFile, pathDest);
});  

// Script Task
gulp.task('script', function () {
  return rollup({
    entry: pathSrc + script,
    context: 'window',
    treeshake: false,
    plugins: [
      resolve({
        jsnext: true,
        main: true,
        browser: true,
      }),
    ],
  }).then(function (bundle) {
    return bundle.write({
      dest: pathDest + libName + '.js',
      format: 'es',
      // moduleName: 'tns',
    });
  });
});

gulp.task('helper-ie8', function () {
  return rollup({
    entry: pathSrc + helperIEScript,
  }).then(function (bundle) {
    return bundle.write({
      dest: pathDest + helperIEScript,
      format: 'es',
    });
  });
});

gulp.task('editPro', ['script'], function() {
  return gulp.src(pathDest + libName + '.js')
    .pipe($.change(function (content) {
      return 'var tns = (function (){\n' + content.replace('export { tns }', 'return tns') + '})();';
    }))
    .pipe(gulp.dest(pathDest))
});

gulp.task('makeDevCopy', function() {
  return gulp.src(pathSrc + script)
    .pipe($.change(function (content) {
      return content
        .replace('IIFE', 'ES MODULE')
        .replace(/bower_components/g, '..');
    }))
    .pipe($.rename({ basename: libName + modulePostfix }))
    .pipe(gulp.dest(pathSrc))
});

gulp.task('min', ['editPro'], function () {
  return gulp.src(pathDest + '*.js')
    .pipe($.sourcemaps.init())
    .pipe($.uglify())
    .pipe($.sourcemaps.write('../' + sourcemapsDest))
    .pipe(gulp.dest(pathDest + 'min'))
})

gulp.task('test', function () {
  return rollup({
    entry: pathTest + testScript,
    context: 'window',
    // treeshake: false,
    plugins: [
      resolve({
        jsnext: true,
        main: true,
        browser: true,
      }),
    ],
  }).then(function (bundle) {
    return bundle.write({
      dest: pathTest + testName + '.min.js',
      format: 'iife',
      moduleName: 'tiny',
    });
  });
});

// let testcafeObj = {
//   src: 'tests/tests.js',
//   options: { browsers: ['chrome', 'safari'] },
// };
// testcafe
// gulp.task('testcafe', () => {
//   return gulp.src(testcafeObj.src)
//     .pipe(testcafe(testcafeObj.options));
// });

// browser-sync
gulp.task('server', function() {
  browserSync.init({
    server: {
      baseDir: './'
    },
    ghostMode: {
      clicks: false,
      forms: false,
      scroll: false
    },
    port: '3000',
    open: false,
    notify: false
  });

  gulp.watch('tests/templates/**/*.njk', function (e) {
    var dir = path.parse(e.path).dir,
        njkSrc = (dir.indexOf('parts') === -1) ? e.path : 'tests/templates/*.njk';

    if (e.type !== 'deleted') {
      return gulp.src(njkSrc)
        .pipe($.plumber())
        .pipe($.nunjucks.compile({}, {
          watch: true,
          noCache: true
        }))
        .pipe($.rename(function (path) { path.extname = '.html'; }))
        .pipe($.htmltidy({
          doctype: 'html5',
          wrap: 0,
          hideComments: false,
          indent: true,
          'indent-attributes': false,
          'drop-empty-elements': false,
          'force-output': true
        }))
        .pipe(gulp.dest('./tests'));
    }
  });
  gulp.watch(pathSrc + sassFile, function (e) {
    sassTask(pathSrc + sassFile, pathDest);
  });
  gulp.watch(pathSrc + script, ['makeDevCopy']);
  gulp.watch(scriptSources, ['min']);
  gulp.watch(pathSrc + helperIEScript, ['helper-ie8']);
  gulp.watch([pathTest + testScript], ['test']);
  gulp.watch(['**/*.html', pathTest + '*.js', pathDest + '*.css', pathDest + 'min/*.js']).on('change', browserSync.reload);
});

// Default Task
gulp.task('default', [
  // 'sass',
  // 'min',
  // 'helper-ie8',
  // 'makeDevCopy',
  // 'test',
  'server', 
]);  