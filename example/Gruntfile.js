module.exports = function (grunt) {

  grunt.loadNpmTasks("grunt-nodemon");
  grunt.loadNpmTasks("grunt-shell");
  grunt.loadNpmTasks("grunt-cafe-mocha");
  grunt.loadNpmTasks("grunt-contrib-jshint");
  grunt.loadNpmTasks('grunt-node-inspector');
  grunt.loadNpmTasks('grunt-concurrent');

  grunt.initConfig({
    cafemocha: {
      test: {
        src: ["test/**/*_spec.js"],
        options: {
          ui: 'bdd',
          reporter: 'dot'
        }
      },
    },

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
        noyield: true
      },
      appFiles: {
        src: [
          'app.js',
          'controllers/**/*.js',
          'helpers/**/*.js',
          'middleware/**/*.js',
          'models/**/*.js',
          'services/**/*.js',
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
        src: ['test/**/*.js']
      },
    },

    coverageThreshold: 95,
    shell: {
      cov: {
        command: "istanbul cover _mocha -- -R dot",
        options: {
          stdout: true
        },
      },

      checkCov: {
        command: 'istanbul check-coverage --lines <%= coverageThreshold %>',
        options: {
          callback: function (err, stdout, stderr, cb) {
            var matches;
            if (stderr) {
              matches = stderr.match(/(ERROR: .*)/);
              console.log("\n" + matches[0]);
            }
            cb();
          }
        }
      },

      startApp: {
        command: 'node ./app.js',
        options: {
          stdout: true
        }
      },

      debugApp: {
        command: 'node --debug ./app.js',
        options: {
          stdout: true
        }
      }
    },

    // node-inspector configuration
    "node-inspector": {
      custom: {
        options: {
          //'stack-trace-limit': 50,
          'web-port': 8080,
          'web-host': 'localhost',
          'debug-port': 5858,
          'save-live-edit': true
        }
      }
    },

    // Module to run two grunt tasks at the same time
    concurrent: {
      debugger: {
        tasks: ['shell:debugApp', 'node-inspector'],
        options: {
          logConcurrentOutput: true
        }
      }
    }
  });

  grunt.registerTask("default", ['jshint']);

  // Output JSHint data in checkstyle format
  grunt.registerTask("jshint:checkstyle", function () {
    grunt.config('jshint.options.reporter', 'checkstyle');
    grunt.config('jshint.options.reporterOutput', 'jshint.xml');
    grunt.task.run('jshint');
  });

  grunt.registerTask("spec", ['cafemocha:test']);

  grunt.registerTask("cov", ['shell:cov']);
  grunt.registerTask("cov:check", ['shell:cov', 'shell:checkCov']);

  grunt.registerTask('app:start', ['shell:startApp']);
  grunt.registerTask('app:debug', ['concurrent:debugger']);
};
