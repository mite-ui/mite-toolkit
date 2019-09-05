const rollup = require('rollup');
const path = require('path');
const glob = require('glob')
const fs = require('fs')
const rimraf = require('rimraf')

const resolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');
const babel = require('rollup-plugin-babel');

const run = function() {
  const cwd = process.cwd()
  const inputOptions = {
    plugins: [
      babel({
        runtimeHelpers: true,
        exclude: 'node_modules/**' // 只编译我们的源代码
      }),
      resolve({
        customResolveOptions: {
          moduleDirectory: 'node_modules'
        }
      }),
      commonjs(),
    ],
    external: (name) => {
      return ['react', 'mite-ui'].includes(name)
        || /^\@babel\/runtime/.test(name) 
        || /^\./.test(name) 
    }
  };
  const outputOptions = {};
  glob(cwd + '/components/**/*.@(js|ts|tsx|jsx)', (err, matches) => {
    if (err) {
      console.log(err);
      return;
    }
    rimraf.sync(cwd + '/lib')
    rimraf.sync(cwd + '/es')
  
    matches.forEach((file) => {
      const relativePath = path.relative(cwd + '/components/', file);
      const parse = path.parse(relativePath);

      rollup.rollup({...inputOptions, input: file}).then((bundle) => {
        
        const outPath = path.join(cwd, 'es', parse.dir, parse.name + '.js');
        bundle.write({...outputOptions, format: 'esm', file: outPath});
      }).catch(err => console.log(err))

      rollup.rollup({...inputOptions, input: file}).then((bundle) => {
        const outPath = path.join(cwd, 'lib', parse.dir, parse.name + '.js');
        bundle.write({...outputOptions, format: 'cjs', file: outPath});
      }).catch(err => console.log(err))
    })
  })
}

module.exports = {
  run
}