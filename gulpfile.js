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
const htmlMinify = require('html-minifier');
const sass = require('gulp-sass')(require('sass'));
const rename = require('gulp-rename');
const babel = require('gulp-babel');
const uglify = require('gulp-uglify');
const concatJs = require('gulp-concat');
const sitemap = require('gulp-sitemap');

const paths = {
  html: {
    src: './src/**/*.html',
    dest: 'dist/',
  },
  css: {
    src: './src/styles/**/*.css',
    dest: 'dist/styles',
  },
  scss: {
    src: './src/styles/**/*.scss',
    dest: 'dist/styles/',
  },
  images: {
    src: './src/images/**/*',
    dest: 'dist/images/',
  },
  fonts: {
    src: './src/fonts/**/*',
    dest: 'dist/fonts',
  },
  other: {
    src: './src/{robots.txt,.htaccess,sitemap.xml}',
    dest: 'dist/',
  },
  js: {
    src: './src/js/**/*.js',
    dest: 'dist/js',
  },
};

function html() {
  if (!isDev()) {
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
    return gulp
      .src('src/**/*.html')
      .pipe(plumber())
      .on('data', function (file) {
        const buferFile = Buffer.from(
          htmlMinify.minify(file.contents.toString(), options)
        );
        return (file.contents = buferFile);
      })
      .pipe(gulp.dest('dist/'));
  } else {
    return gulp
      .src('src/**/*.html')
      .pipe(plumber())
      .pipe(gulp.dest('dist/'))
      .pipe(browserSync.reload({ stream: true }));
  }
}

function css() {
  const plugins = [autoprefixer(), mediaquery(), cssnano()];
  return gulp
    .src(paths.css.src)
    .pipe(plumber())
    .pipe(concat('bundle.css'))
    .pipe(postcss(plugins))
    .pipe(gulp.dest(paths.css.dest))
    .pipe(browserSync.reload({ stream: true }));
}

function scss() {
  if (!isDev()) {
    const plugins = [autoprefixer(), mediaquery(), cssnano()];
    return gulp
      .src(paths.scss.src)
      .pipe(sass())
      .pipe(plumber())
      .pipe(concat('bundle.css'))
      .pipe(postcss(plugins))
      .pipe(gulp.dest(paths.scss.dest));
  } else {
    const plugins = [autoprefixer(), mediaquery()];
    return gulp
      .src(paths.scss.src)
      .pipe(sass())
      .pipe(plumber())
      .pipe(concat('bundle.css'))
      .pipe(postcss(plugins))
      .pipe(gulp.dest(paths.scss.dest))
      .pipe(browserSync.reload({ stream: true }));
  }
}

function js() {
  if (checkJsDirectory()) {
    if (!isDev) {
      return gulp
        .src(paths.js.src)
        .pipe(
          babel({
            presets: ['@babel/preset-env'],
          })
        )
        .pipe(uglify())
        .pipe(concatJs('bundle.js'))
        .pipe(gulp.dest(paths.js.dest));
    } else {
      return gulp
        .src(paths.js.src)
        .pipe(
          babel({
            presets: ['@babel/preset-env'],
          })
        )
        .pipe(concatJs('bundle.js'))
        .pipe(gulp.dest(paths.js.dest))
        .pipe(browserSync.reload({ stream: true }));
    }
  } else {
    console.warn(
      'Директория src/js не найдена. Сборка будет выполнена без JavaScript.'
    );
    return Promise.resolve();
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
        siteUrl: 'https://sitename.com',
        changefreq: 'weekly',
        priority: function (file) {
          return file.relative === 'index.html' ? 1.0 : 0.9;
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
  gulp.watch(paths.css.src, css);
  gulp.watch(paths.scss.dev.src, scss);
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
exports.css = css;
exports.scss = scss;
exports.js = js;
exports.images = images;
exports.fonts = fonts;
exports.otherFiles = otherFiles;
exports.clean = clean;
exports.build = build;
exports.watchapp = watchapp;
exports.default = watchapp;
