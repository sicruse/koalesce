module.exports = function (grunt) {
    grunt.initConfig({
        jshint: {
            options: {
                node: true,
                camelcase: true,
                curly: true,
                eqnull: true,
                eqeqeq: true,
                undef: true,
                unused: true,
                plusplus: false,
                latedef: true,
                newcap: true,
                noempty: true,
                esnext: true,
                freeze: true,
                immed: true,
                noyield: true,
                validthis: true,
                expr: true
            },
            appFiles: {
                src: [
                    'index.js',
                    'lib/**/*.js',
                    'Gruntfile.js'
                ]
            },
            testFiles: {
                options: {
                    globals: {
                        // Mocha
                        "describe": false,
                        "it": false,
                        "before": false,
                        "beforeEach": false,
                        "after": false,
                        "afterEach": false
                    }
                },
                src: ['tests/**/*.test.js']
            },
        },
        shell: {
            mocha: {
                command: "NODE_ENV=test node --harmony node_modules/mocha-co/bin/mocha --harmony test/**/*.test.js",
                options: {
                    stdout: true,
                    stderr: true
                }
            },
            coverage: {
                command: "NODE_ENV=test node --harmony node_modules/istanbul/lib/cli.js cover --dir coverage/server _mocha -- -R dot --timeout 30000 test/**/*.test.js",
                options: {
                    stdout: true,
                    stderr: true
                },
            }
        }
    });
    
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-shell');

    grunt.registerTask('default', ['shell:test']);
    
    grunt.registerTask("jshint:checkstyle", function () {
        grunt.config('jshint.options.reporter', 'checkstyle');
        grunt.config('jshint.options.reporterOutput', 'jshint.xml');
        grunt.task.run('jshint');
    });
    grunt.registerTask('mocha', ['shell:mocha']);
    grunt.registerTask('coverage', ['shell:coverage']);
};
