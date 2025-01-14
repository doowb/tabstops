'use strict';

const Block = require('./Block');
const builtins = require('../helpers');
const REGEX_FORMAT_RE = /^(?:\$([0-9]+)|\${([0-9]+)(?:(:)?([-+?\/])?((?:\\[^\\]|.)+?)(?::((?:\\[^\\]|.)+?))?)?})(.*)$/;

class Transform extends Block {
  onClose(options) {
    this.params = this.parse(options);
    super.onClose(options);
  }

  parse(options) {
    const keys = ['source', 'format', 'flags'];
    const nodes = this.nodes.slice(1, -1);
    const name = this.name || this.nodes[0].match[1];

    let params = { type: this.type, string: this.stringify(), varname: name };
    let type = keys.shift();

    while (nodes.length) {
      let node = nodes.shift();
      if (!node.match && !node.nodes) continue;

      if (node.value === '/' && nodes.length) {
        node = nodes.shift();
        params[(type = keys.shift())] = node.stringify();
        continue;
      }

      if (node.value === '/') {
        continue;
      }

      if (params[type]) {
        params[type] = [].concat(params[type]).concat(node.stringify());
      } else {
        params[type] = node.stringify();
      }
    }

    while (keys.length) {
      params[keys.shift()] = '';
    }

    if (params.flags && !/^[gimuy]+$/.test(params.flags)) {
      params.invalid = true;
      return params;
    }

    if (!params.source) {
      params.source = '$^';
      params.flags = '';
    }

    try {
      params.source = [].concat(params.source).join('');
      params.regex = new RegExp(params.source, params.flags);
      params.replacers = this.replacers(params.format, options);
    } catch (err) {
      if (!(err instanceof SyntaxError)) {
        throw err;
      }
      params.invalid = true;
      return params;
    }

    return params;
  }

  replacers(format, options = {}) {
    const helpers = { ...builtins, ...options.helpers };

    return [].concat(format).map(str => {
      let match = REGEX_FORMAT_RE.exec(str);
      if (!match) {
        if (str === '/') str = '';
        return { value: str };
      }

      let capture = match[1] || match[2];
      let delim = match[3];
      let operator = match[4] || '';
      let rest = [match[5], match[6]];

      let helperName = '';
      let helper = '';
      let elseValue = '';
      let ifValue = '';

      if (delim) {
        switch (operator) {
          case '/':
            helperName = rest[0];
            helper = helpers[rest[0]];
            break;
          case '+':
            ifValue = rest[0];
            break;
          case '?':
            if (rest.length !== 2) return str;
            ifValue = rest[0];
            elseValue = rest[1];
            break;
          case '-':
          case '':
          default: {
            elseValue = rest[0];
            break;
          }
        }
      }

      return {
        index: Number(capture),
        helper,
        helperName,
        operator,
        ifValue,
        elseValue
      };
    });
  }

  transform(variable) {
    let { replacers } = this.params;
    let value = variable != null ? String(variable) : '';
    let matched = false;

    if (this.params.invalid === true) {
      return this.params.string;
    }

    let result = value.replace(this.params.regex, (...args) => {
      let index = args[args.length - 2];
      args = args.slice(0, -2);
      matched = true;

      let output = '';

      for (let replacer of replacers) {
        if (replacer.value) {
          output += replacer.value;
          continue;
        }

        if (replacer.operator === '-') {
          output += args[0];
          continue;
        }

        let arg = args[replacer.index];

        if (replacer.operator === '+' && arg !== void 0) {
          output += replacer.ifValue;
          continue;
        }

        if (replacer.operator === '?') {
          if (arg !== void 0) {
            output += replacer.ifValue;
          } else {
            output += replacer.elseValue;
          }
          continue;
        }

        if (replacer.operator === '/' && arg !== void 0) {
          output += replacer.helper(arg, index, value) || '';
          continue;
        }

        if (replacer.operator !== '-' && arg !== void 0) {
          output += arg;
          continue;
        }
      }

      return output;
    });

    if (matched === false) {
      let replacer = replacers[0];

      if (replacers.length === 1 && replacer.elseValue) {
        return replacer.elseValue;
      }

      return '';
    }

    return result;
  }
}

module.exports = Transform;
