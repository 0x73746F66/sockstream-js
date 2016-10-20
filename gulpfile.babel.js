'use strict';

import gulp from "gulp";
import babel from "gulp-babel";
import browserSync from "browser-sync";
import gulpIf from "gulp-if";
import changed from "gulp-changed";
import minify from "gulp-minify";
import runSequence from "run-sequence";
import del from "del";

let _sync = false;

gulp.task('default', cb =>
  runSequence(['build'], ['watch'], cb)
);

gulp.task('build', cb =>
  runSequence(['build:js'], cb)
);

gulp.task('build:clean', cb =>
  runSequence('clean', ['build:js'], cb)
);

gulp.task('watch', cb =>
  runSequence(['browser-sync'], ['watch:app'], cb)
);

gulp.task('clean', ()=> {
  del(['./build/js']);
});

gulp.task('build:js', ()=>
  gulp.src('./src/js/*.js')
    .pipe(changed('./build/js', {extension: '.js'}))
    .pipe(babel({
      presets: ['es2015', 'es2016', 'stage-0']
    }))
    .pipe(gulp.dest('./build/js'))
    .pipe(gulpIf(_sync, browserSync.reload({stream: true})))
);

gulp.task('watch:app', ()=> {
  gulp.watch(['./src/js/*.js'], ['build:js']);
});

gulp.task('browser-sync', ()=> {
  _sync = true;
  browserSync.create();
  browserSync.init({
    serveStatic: ['.', './build'],
    logLevel: 'debug',
    open: false,
    reloadOnRestart: true,
    logConnections: true
  });
});

gulp.task('compress', ()=> {
  gulp.src('./build/js/*.js')
    .pipe(minify({
      ext:{
        src:'.js',
        min:'.min.js'
      },
      ignoreFiles: ['.min.js']
    }))
    .pipe(gulp.dest('./dist'))
});