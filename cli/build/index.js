const rollup = require('rollup');
const path = require('path');
const glob = require('glob')
const fs = require('fs')
const rimraf = require('rimraf')

const resolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');
const less = require('rollup-plugin-less');
const babel = require('rollup-plugin-babel');

const run = function() {
  const cwd = process.cwd();
  const pkg = require(cwd+'/package.json');
  
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
      less(),
      commonjs()
    ],
    external: (name) => {
      const matches = name.match(/([^\/]*)\/?/)
      const pkgName = matches && matches.length > 1 ? matches[1] : ''
      return [...Object.keys(pkg.devDependencies)].includes(pkgName)
        || /^react/.test(name)
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