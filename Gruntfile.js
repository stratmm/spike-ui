module.exports = function (grunt) {

    var vendors = 'jquery backbone backbone.marionette bootstrap'.split(' ');
    spawn = require('child_process').spawn;

    grunt.initConfig({

        copy: {
          main: {
            files: [
              // include bootstrap.js
              {expand: false, src: ['bower_components/bootstrap/dist/js/bootstrap.js'], dest: 'src/lib/vendor/js/bootstrap.js', filter: 'isFile'},
              {expand: true, flatten: true, src: ['bower_components/bootstrap/less/**'], dest: 'src/lib/vendor/bootstrap/less/', filter: 'isFile'},
              {expand: true, flatten: true, src: ['bower_components/bootstrap/fonts/**'], dest: 'src/lib/vendor/bootstrap/fonts/', filter: 'isFile'},
              {expand: true, flatten: true, src: ['bower_components/bootstrap/fonts/**'], dest: 'dist/fonts/', filter: 'isFile'}
            ]
          }
        },
        browserify: {
            // just the app
            app: {
                src: 'src/app.coffee',
                dest: 'dist/app.js',
                options: {
                    debug: true,
                    extensions: ['.coffee'],
                    transform: ['coffeeify'],
                    external: vendors
                }
            },
            // just vendors
            vendors: {
                files: {
                    'dist/vendors.js': []
                },
                options: {
                    'require': vendors
                }
            },
            // bundle all in one
            bundle: {
                src: 'src/app.js',
                dest: 'dist/bundle.js',
                options: {
                    extensions: ['.coffee'],
                    transform: ['coffeeify']
                }
            }
        },

        // produce index.html by target
        targethtml: {
            dev: {
                src: 'src/index.html',
                dest: 'dist/index.html'
            },
            prod: {
                src: 'src/index.html',
                dest: 'dist/index.html'
            }
        },

        uglify: {
            bundle: {
                src: 'dist/bundle.js',
                dest: 'dist/bundle.js'
            }
        },

        watch: {
            options: {
                livereload: true,
                spawn: false,
                interrupt: true
            },
            src: {
                files: ['src/**/*', '!src/index.html'],
                tasks: ['browserify:app', 'template-compile'],
            },
            index: {
                files: ['src/index.html'],
                tasks: ['targethtml:dev']
            },
            assets: {
                files: ['assets/**/*']
            }
        },

        connect: {
            server: {
                options: {
                    hostname: '0.0.0.0',
                    port:8000,
                    base: "./dist",
                    open: true,
                    useAvailablePort: true,
                    livereload: true
                }
            }
        }

    });

    grunt.loadNpmTasks('grunt-browserify');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-targethtml');
    grunt.loadNpmTasks('grunt-contrib-copy');

    // Register compile task
    grunt.registerTask('template-compile', function(){

        // Compile the *.hamlc-template to a single templates.js-file
        spawn('haml-coffee', ['-i','src/app/templates', '-o', 'dist/templates.js', '-n', 'window.templates']);

    });

    grunt.registerTask('builddev', ['copy', 'browserify:app', 'browserify:vendors', 'targethtml:dev', 'template-compile']);
    grunt.registerTask('buildprod', ['browserify:bundle', 'uglify', 'targethtml:prod']);
    grunt.registerTask('run',   ['builddev', 'connect', 'watch']);

};