import svelte from "rollup-plugin-svelte";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import { terser } from "rollup-plugin-terser";
import sveltePreprocess from "svelte-preprocess";
import typescript from "@rollup/plugin-typescript";
import css from 'rollup-plugin-css-only';
import path from "path";
import fs from "fs";
import copy from 'rollup-plugin-copy'


const production = !process.env.ROLLUP_WATCH;

export default fs
  .readdirSync(path.join(__dirname, "webviews", "pages"))
  .map((input) => {
    const name = input.split(".")[0];
    return {
      input: "webviews/pages/" + input,
      output: {
        sourcemap: true,
        format: "iife",
        name: "app",
        file: "out/compiled/" + name + ".js",
        inlineDynamicImports : true
      },
      plugins: [
        svelte({
          dev: !production,
          emitCss : true, 
          css: (css) => {
            css.write(name + ".css");
          },
          preprocess: sveltePreprocess(),
        }),
        resolve({
          browser: true,
          dedupe: ["svelte"],
        }),
        commonjs(),
        typescript({
          tsconfig: "webviews/tsconfig.json",
          sourceMap: !production,
          inlineSources: !production,
        }),
        production && terser(),
        css({output : name + ".css"}),
        copy({
          targets: [{ 
              src: 'node_modules/bootstrap/dist/**/*', 
              dest: 'public/vendor/bootstrap' 
          }]})
      ],
      watch: {
        clearScreen: false,
      },
    };
  });