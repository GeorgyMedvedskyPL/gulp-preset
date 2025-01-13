const fs = require('fs');
const path = require('path');
const gulp = require('gulp');
const concat = require('gulp-concat-css');
const plumber = require('gulp-plumber');
const del = require('del');
const browserSync = require('browser-sync').create();
const postcss = require('gulp-postcss');
const autoprefixer = require('autoprefixer');
const mediaquery = require('postcss-combine-media-query');
const cssnano = require('cssnano');
const htmlmin = require('gulp-htmlmin');
const sass = require('gulp-sass')(require('sass'));
const babel = require('gulp-babel');
const uglify = require('gulp-uglify');
const concatJs = require('gulp-concat');
const sitemap = require('gulp-sitemap');

const paths = {
  html: {
    src: './src/**/*.html',
    dest: 'dist/',
  },
  scss: {
    src: './src/styles/index.scss',
    dest: 'dist/styles/',
  },
  images: {
    src: './src/images/**/*',
    dest: 'dist/images/',
  },
  fonts: {
    src: './src/fonts/**/*',
    dest: 'dist/fonts/',
  },
  other: {
    src: './src/{robots.txt,.htaccess}',
    dest: 'dist/',
  },
  js: {
    src: './src/js/**/*.js',
    dest: 'dist/js/',
  },
};

function html() {
  const commonStream = gulp.src(paths.html.src).pipe(plumber());
  const options = {
    removeComments: true,
    removeRedundantAttributes: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
    sortClassName: true,
    useShortDoctype: true,
    collapseWhitespace: true,
    minifyCSS: true,
    keepClosingSlash: true,
  };

  if (isDev()) {
    return commonStream
      .pipe(gulp.dest(paths.html.dest))
      .pipe(browserSync.reload({ stream: true }));
  } else {
    return commonStream.pipe(htmlmin(options)).pipe(gulp.dest(paths.html.dest));
  }
}

function scss() {
  const workflow = (...plugins) =>
    gulp
      .src(paths.scss.src)
      .pipe(
        plumber({
          errorHandler: function (err) {
            console.error('Error!', err.message);
            this.emit('end');
          },
        })
      )
      .pipe(sass().on('error', sass.logError))
      .pipe(concat('bundle.css'))
      .pipe(postcss(plugins))
      .pipe(gulp.dest(paths.scss.dest));

  const plugins = isDev()
    ? [autoprefixer(), mediaquery()]
    : [autoprefixer(), mediaquery(), cssnano()];

  return workflow(...plugins).pipe(browserSync.reload({ stream: true }));
}

function js() {
  if (!checkJsDirectory()) {
    console.warn(
      'Директория src/js не найдена. Сборка будет выполнена без JavaScript.'
    );
    return Promise.resolve();
  }

  const commonStream = gulp
    .src(paths.js.src)
    .pipe(plumber())
    .pipe(
      babel({
        presets: ['@babel/preset-env'],
      })
    );

  if (!isDev()) {
    return commonStream
      .pipe(uglify())
      .pipe(concatJs('bundle.js'))
      .pipe(gulp.dest(paths.js.dest));
  } else {
    return commonStream
      .pipe(concatJs('bundle.js'))
      .pipe(gulp.dest(paths.js.dest))
      .pipe(browserSync.reload({ stream: true }));
  }
}

function fonts() {
  return gulp
    .src(paths.fonts.src, { encoding: false })
    .pipe(gulp.dest(paths.fonts.dest));
}

function images() {
  return gulp
    .src(paths.images.src, { encoding: false })
    .pipe(gulp.dest(paths.images.dest));
}

function initSitemap() {
  return gulp
    .src(paths.html.src, { read: false })
    .pipe(
      sitemap({
        siteUrl: 'https://sitename.com', // Замените sitename
        changefreq: 'weekly',
        priority: function (file) {
          return file.relative === 'index.html' ? 1.0 : 0.5;
        },
      })
    )
    .pipe(gulp.dest(paths.html.dest));
}

function otherFiles() {
  if (!isDev()) {
    return gulp.src(paths.other.src).pipe(gulp.dest(paths.other.dest));
  }
  return;
}

function clean() {
  return del('dist');
}

function watchFiles() {
  gulp.watch(paths.html.src, html);
  gulp.watch(paths.fonts.src, fonts);
  gulp.watch('src/styles/**/*.scss', scss);
  gulp.watch(paths.js.src, js);
  gulp.watch(paths.images.src, images);
}

function serve() {
  browserSync.init({
    server: {
      baseDir: './dist',
    },
  });
}

function isDev() {
  return process.env.NODE_ENV === 'dev';
}

function checkJsDirectory() {
  const dirPath = path.join(__dirname, 'src', 'js');
  return fs.existsSync(dirPath);
}

const build = gulp.series(
  gulp.series(clean, html, initSitemap, fonts, scss, js, images, otherFiles)
);
const watchapp = gulp.parallel(build, watchFiles, serve);

exports.html = html;
exports.initSitemap = initSitemap;
exports.scss = scss;
exports.js = js;
exports.images = images;
exports.fonts = fonts;
exports.otherFiles = otherFiles;
exports.clean = clean;
exports.build = build;
exports.watchapp = watchapp;
exports.default = watchapp;
