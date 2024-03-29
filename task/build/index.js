/*
* @Author: zunyi
* @Date: 2021-10-28 16:02:17
 * @LastEditors: zunyi
 * @LastEditTime: 2023-09-18 16:38:36
*/
const { rollup } = require("rollup");
const { babel, getBabelOutputPlugin } = require('@rollup/plugin-babel');
const { nodeResolve } = require('@rollup/plugin-node-resolve')
const clear = require('rollup-plugin-clear')
const postcss = require('rollup-plugin-postcss')
const sass = require('rollup-plugin-sass')

const image = require('@rollup/plugin-image')
const alias = require('@rollup/plugin-alias')
const commonjs = require('@rollup/plugin-commonjs');
const vuePlugin = require('rollup-plugin-vue')
const replace = require('@rollup/plugin-replace')
const json = require('@rollup/plugin-json')
const path = require('path');
const glob = require('glob')

const fse = require('fs-extra')


const run = function (){
  const cwd = process.cwd();
  const pkg = require(cwd+'/package.json');
  const indexFile = path.join(cwd, pkg.index || pkg.main);

  const build = (outputPath, format, options) => {
    const external = (name) => {
      const matches = name.match(/([^\/]*)\/?/);
      const pkgName = matches && matches.length > 1 ? matches[1] : '';

      if(/\.vue$/.test(name) || /package\.json$/.test(name)) return false
      // if(/style-inject\.es\.js$/.test(name)) return false

      const innerExternal = /^\./.test(name)
      || /^lib\//.test(name)
      || /^es\//.test(name)
      || /^sr\@c\//.test(name)
      || /^@\//.test(name)
      
      return [...Object.keys(pkg.devDependencies || {})].includes(pkgName)
       || /^vue/.test(name)
       || /.*node_modules.*/.test(name)
       || /^\@babel\/runtime/.test(name)
       || (options.multiple && innerExternal)
    }

    const replacePlugin = replace({
      preventAssignment: true,
      'sr\@c\/': path.join(pkg.name, outputPath, '/'),
      '@\/': path.join(pkg.name, outputPath, '/'),
    })

    const aliasPlugin = alias({
      entries: [
        {
          find: /(^sr\@c)|(^@)/,
          replacement: path.resolve(cwd, 'src')
        }
      ]
    })

    const plugins = [
      clear({
        targets: [cwd + '/dist']
      }),
      json(),
      image(),
      sass(),
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
        exclude: 'node_modules/**',
        plugins: [
          '@babel/plugin-proposal-object-rest-spread',
          '@babel/plugin-proposal-optional-chaining',
          '@babel/plugin-syntax-dynamic-import',
          '@babel/plugin-proposal-class-properties'
        ]
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
      const out = path.join(cwd, outputPath, parse.dir, parse.name + `${
        options.multiple ? '' : '.' + format
      }` + '.js');

      const outputOptions = { plugins: outPlugins, format, file: out, sourcemap: !!options.sourcemap}

      rollup(inputOptions).then((bundle) => {
        bundle.write(outputOptions);
      }).catch(err => console.log(err))
    }
  }
   
  const esBuild = build('\/dist\/es', 'esm', {replace: true, multiple: true})
  const cjsBuild = build('\/dist\/lib', 'cjs', {replace: true, multiple: true})
  
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

  fse.copy(path.join(cwd, 'src\/assets'), path.join(cwd, 'dist\/es\/assets'))
  fse.copy(path.join(cwd, 'src\/assets'), path.join(cwd, 'dist\/lib\/assets'))
  
  build('dist', 'iife', {alias: true, sourcemap: true})(indexFile)
  build('dist', 'esm', {alias: true, sourcemap: true, babel: true})(indexFile)
  build('dist', 'cjs', {alias: true, sourcemap: true, babel: true})(indexFile)
}

module.exports = {
  run
}