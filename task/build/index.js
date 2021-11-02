/*
* @Author: zunyi
* @Date: 2021-10-28 16:02:17
 * @LastEditors: zunyi
 * @LastEditTime: 2021-11-02 14:27:09
*/
const { rollup } = require("rollup");
const { babel, getBabelOutputPlugin } = require('@rollup/plugin-babel');
const { nodeResolve } = require('@rollup/plugin-node-resolve')
const clear = require('rollup-plugin-clear')
const postcss = require('rollup-plugin-postcss')
const alias = require('@rollup/plugin-alias')
const commonjs = require('@rollup/plugin-commonjs');
const vuePlugin = require('rollup-plugin-vue')
const replace = require('@rollup/plugin-replace')
const path = require('path');
const glob = require('glob')

const run = function (){
  const cwd = process.cwd();
  const pkg = require(cwd+'/package.json');
  const indexFile = path.join(cwd, pkg.index || pkg.main);

  const build = (outputPath, format, options) => {
    const external = (name) => {
      const matches = name.match(/([^\/]*)\/?/);
      const pkgName = matches && matches.length > 1 ? matches[1] : '';

      if(/\.vue$/.test(name)) return false
      // if(/style-inject\.es\.js$/.test(name)) return false

      const innerExternal = /^\./.test(name)
      || /^lib\//.test(name)
      || /^es\//.test(name)
      || /sr\@c\//.test(name);
      
      return [...Object.keys(pkg.devDependencies || {})].includes(pkgName)
       || /^vue/.test(name)
       || /.*node_modules.*/.test(name)
       || /^\@babel\/runtime/.test(name)
       || (options.multiple && innerExternal)
    }

    const replacePlugin = replace({
      preventAssignment: true,
      'sr\@c': outputPath
    })

    const aliasPlugin = alias({
      entries: [
        {
          find: /^sr\@c/,
          replacement: path.resolve(cwd, 'src')
        }
      ]
    })

    const plugins = [
      clear({
        targets: [cwd + '/dist']
      }),
      vuePlugin({
        exposeFilename: false,
        target: 'browser'
      }),
      postcss({
        inject: true,
        extract: false,
        plugins: []
      }),
      babel({
        babelHelpers: 'runtime',
        skipPreflightCheck: true,
        exclude: 'node_modules/**'
      }),
      nodeResolve(),
      commonjs(),
    ]

    if(options.replace) {
      plugins.push(replacePlugin)
    }
    
    if(options.alias) {
      plugins.push(aliasPlugin)
    }

    const outPlugins = options.babel ? [
      getBabelOutputPlugin({
        presets: ['@babel/preset-env'],
        plugins: [
          ['@babel/plugin-transform-runtime', { useESModules: format === 'esm' }]
        ]
      })
    ] : []
  
    return (file) => {
      const inputOptions = {external, plugins, input: file}

      const relativePath = path.relative(cwd + '/src/', file);
      const parse = path.parse(relativePath);
      const out = path.join(cwd, 'dist', outputPath, parse.dir, parse.name + `${
        options.multiple ? '' : '.' + format
      }` + '.js');

      const outputOptions = { plugins: outPlugins, format, file: out, sourcemap: !!options.sourcemap}

      rollup(inputOptions).then((bundle) => {
        bundle.write(outputOptions);
      }).catch(err => console.log(err))
    }
  }
    
  const esBuild = build('es', 'esm', {replace: true, multiple: true})
  const cjsBuild = build('lib', 'cjs', {replace: true, multiple: true})
  
  glob(cwd + '/src/**/*.@(js|ts|tsx|jsx)', (err, matches) => {
    if (err) {
      console.log(err);
      return;
    }
    matches.forEach((file) => {
      esBuild(file)
      cjsBuild(file)
    })
  })
  
  build('.', 'iife', {alias: true, sourcemap: true})(indexFile)
  build('.', 'esm', {alias: true, sourcemap: true, babel: true})(indexFile)
  build('.', 'cjs', {alias: true, sourcemap: true, babel: true})(indexFile)
}

module.exports = {
  run
}