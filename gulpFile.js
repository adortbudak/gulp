/**
 * Created by adortbud on 8/18/2016.
 */
var gulp = require('gulp');
var args = require('yargs').argv;
var browserSync = require('browser-sync');
var config = require('./gulp.config')();
var del = require('del');
var $ = require('gulp-load-plugins')({lazy: true});
var port = process.env.PORT || config.defaultPort;

gulp.task('help',$.taskListing);
gulp.task('default',['help']);

gulp.task('vet', function () {
    log('Analyzing source with JSHint and JSCS');
    return gulp.src(config.alljs)
        .pipe($.if(args.verbose,$.print()))
        .pipe($.jscs())
        .pipe($.jshint())
        .pipe($.jshint.reporter('jshint-stylish',{verbose:true}))
        .pipe($.jshint.reporter('fail'));
});

gulp.task('styles',function () {
    log('Compiling Less --> CSS');
    return gulp
        .src(config.less)
        .pipe($.plumber())
        .pipe($.less())
        .pipe($.autoprefixer({browsers: ['last 2 version','> 5%']}))
        .pipe(gulp.dest(config.temp));

});

gulp.task('fonts',function () {
    log('Copying fonts');
    return gulp.src(config.fonts)
        .pipe(gulp.dest(config.build + 'fonts'));
});

gulp.task('images',function () {
    log('Copying and compressing images');
    return gulp.src(config.images)
        .pipe($.imagemin({optimizationLevel:4}))
        .pipe(gulp.dest(config.build + 'images'));
});


gulp.task('clean-styles',function (done) {
    clean(config.temp + '**/*.css',done);
});

gulp.task('clean-images',function (done) {
    clean(config.build + 'images/**/*.*',done);
});

gulp.task('clean-code',function (done) {
    var files = [].concat(
        config.temp + '**/*.js',
        config.build + '**/*.html',
        config.build + 'js/**/*.js'
    );
    clean(files,done);
});

gulp.task('clean-fonts',function (done) {
    clean(config.build + 'fonts/**/*.*',done);
});

gulp.task('templatecache',['clean-code'],function () {
    log('Creating Angular JS $templaceCache');
    return gulp
        .src(config.htmltemplate)
        .pipe($.minifyHtml({empty: true}))
        .pipe($.angularTemplatecache())
        .pipe(gulp.dest(config.temp));
})

gulp.task('less-watcher',function () {
    gulp.watch([config.less],['styles']);
});

gulp.task('wiredep',function () {
    log('Wire up the bower css js and our app js into the html');
    var options = config.getWiredepDefaultOptions();
    var wiredep = require('wiredep').stream;

    return gulp
        .src(config.index)
        .pipe(wiredep(options))
        .pipe($.inject(gulp.src(config.js)))
        .pipe(gulp.dest(config.client));
});

gulp.task('inject',['wiredep','styles'], function () {
    log('Wire up the app css into the html, and call wiredep');
    var options = config.getWiredepDefaultOptions();
    var wiredep = require('wiredep').stream;

    return gulp
        .src(config.index)
        .pipe($.inject(gulp.src(config.css)))
        .pipe(gulp.dest(config.client));
});

gulp.task('serve-dev',['inject'],function () {
    var isDev = true;

    var nodeOptions = {
        script: config.nodeServer,
        delayTime: 1,
        env: {
            'PORT': port,
            'NODE_ENV' : isDev ? 'dev' : 'build'
        },
        watch: [config.server]
    };
    return $.nodemon(nodeOptions)
        .on('restart',['vet'],function (ev) {
            log('*** nodemon restarted');
            log('files changed on restart:\n' + ev);
        })
        .on('start',function () {
            log('*** nodemon started');
            startBrowserSync();
        })
        .on('crash',function () {
            log('*** nodemon crashed: script crashed for some reason');
        })
        .on('exit',function () {
            log('*** nodemon exited');
        });
});

function errorLogger(error) {
    log('*** Start of Error ***');
    log(error);
    log('*** End of Error');
    this.emit('end');
}

function startBrowserSync() {
    if(browserSync.active){
        return;
    }

    log('Starting browser-sync on port ' + port);

    var options = {
        proxy: 'localhost:' + port,
        port: 3000,
        files: [config.client + '**/*.*'],
        ghostMode:{
            clicks: true,
            location: false,
            forms: true,
            scroll: true
        },
        injectChanges: true,
        logFileChanges: true,
        logLevel: 'debug',
        logPrefix: 'gulp-patterns',
        notify: true,
        reloadDelay: 1000
    };

    browserSync(options);
}

function clean(path,done){
    log('Cleaning: ' + $.util.colors.red(path));
    del(path,done);
}


function log(msg){
    if(typeof (msg) === 'object'){
        for (var item in msg){
            if (msg.hasOwnProperty(item)){
                $.util.log($.util.colors.blue(msg[item]));
            }}
        } else {
            $.util.log($.util.colors.blue(msg));
        }
    }

