'use strict';

console.time('total');
process.on('exit', () => console.timeEnd('total'));

const compile = require('./lib/compile');
const parse = require('./parse');

let rcc = `
<snippet>
  <content><![CDATA[
import React, { Component } from 'react';

export class \${1:\${TM_FILENAME/(.+)\\..+|.*/$1/:ComponentName}} extends Component {
  render() {
    return \${2:(
      \${3:<div>\${0}</div>}
    );}
  }
}

]]></content>
  <tabTrigger>rcc</tabTrigger>
  <scope>source.js -(meta)</scope>
  <description>React: class component</description>
</snippet>
`;

let pkg = `{
  "name": "\${1:name}",
  "description": "\${2:description=This is a description}",
  "version": "\${3:version=0.1.0}",
  "homepage": "\${4:homepage}",
  "author": "\${5:author.name} (https://github.com/\${6:author.username})",
  "repository": "\${7:owner=\${6:author.username}}/\${1:name}",
  "bugs": {
    "url": "https://github.com/\${7:owner=\${6:author.username}}/\${1:name}/issues"
  },
  "files": "$TM_FILEPATH",
  "engines": {
    "node": ">=\${8:engine=10}"
  },
  "license": "\${9:license=MIT}",
  "scripts": {
    "test": "mocha"
  },
  "keywords": "\${10:keywords}",
  "example": "{{{$}}}"
}`

let ast = parse(pkg);
let res = compile(ast);
// console.log(ast);