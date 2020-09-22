// thanks to https://github.com/alexei/sprintf.js/tree/1.1.2
/* global window, exports, define */

type ParseTreeEntry = {
  placeholder: string,
  param_no:    number|undefined,
  keys:        string[]|undefined,
  sign:        string,
  pad_char:    string,
  align:       string,
  width:       string,
  precision:   number|undefined,
  type:        string
} | string;

const re = {
  not_string: /[^s]/,
  not_bool: /[^t]/,
  not_type: /[^T]/,
  not_primitive: /[^v]/,
  number: /[diefg]/,
  numeric_arg: /[bcdiefguxX]/,
  json: /[j]/,
  not_json: /[^j]/,
  text: /^[^\x25]+/,
  modulo: /^\x25{2}/,
  placeholder: /^\x25(?:([1-9]\d*)\$|\(([^)]+)\))?(\+)?(0|'[^$])?(-)?(\d+)?(?:\.(\d+))?([b-gijostTuvxX])/,
  key: /^([a-z_][a-z_\d]*)/i,
  key_access: /^\.([a-z_][a-z_\d]*)/i,
  index_access: /^\[(\d+)]/,
  sign: /^[+-]/
};

export function sprintf(key: string, ...any: any[]): string {
  // `arguments` is not an array, but should be fine for this call
  return sprintf_format(sprintf_parse(key), arguments);
}

export function vsprintf(fmt: string, argv: any[]): string {
  return sprintf.apply(null, [fmt].concat(argv || []) as any);
}

function sprintf_format(parse_tree: ParseTreeEntry[], argv: IArguments): string {
  let cursor = 1;
  const tree_length = parse_tree.length;
  let arg, output = '', i, k, ph, pad, pad_character, pad_length, is_positive, sign;
  for (i = 0; i < tree_length; i++) {
    ph = parse_tree[i]; // convenience purposes only
    if (typeof ph === 'string') {
      output += ph;
    }
    else if (typeof ph === 'object') {
      if (ph.keys) { // keyword argument
        arg = argv[cursor];
        for (k = 0; k < ph.keys.length; k++) {
          if (arg === undefined) {
            throw new Error(sprintf('[sprintf] Cannot access property "%s" of undefined value "%s"', ph.keys[k], ph.keys[k - 1]));
          }
          arg = arg[ph.keys[k]];
        }
      }
      else if (ph.param_no) { // positional argument (explicit)
        arg = argv[ph.param_no];
      }
      else { // positional argument (implicit)
        arg = argv[cursor++];
      }

      if (re.not_type.test(ph.type) && re.not_primitive.test(ph.type) && arg instanceof Function) {
        arg = arg();
      }

      if (re.numeric_arg.test(ph.type) && (typeof arg !== 'number' && isNaN(arg))) {
        throw new TypeError(sprintf('[sprintf] expecting number but found %T', arg));
      }

      if (re.number.test(ph.type)) {
        is_positive = arg >= 0;
      }

      switch (ph.type) {
        case 'b':
          arg = parseInt(arg, 10).toString(2);
          break;
        case 'c':
          arg = String.fromCharCode(parseInt(arg, 10));
          break;
        case 'd':
        case 'i':
          arg = parseInt(arg, 10);
          break;
        case 'j':
          arg = JSON.stringify(arg, null, ph.width ? parseInt(ph.width) : 0);
          break;
        case 'e':
          arg = ph.precision ? parseFloat(arg).toExponential(ph.precision) : parseFloat(arg).toExponential();
          break;
        case 'f':
          arg = ph.precision ? parseFloat(arg).toFixed(ph.precision) : parseFloat(arg);
          break;
        case 'g':
          arg = ph.precision ? String(Number(arg.toPrecision(ph.precision))) : parseFloat(arg);
          break
        case 'o':
          arg = (parseInt(arg, 10) >>> 0).toString(8);
          break;
        case 's':
          arg = String(arg);
          arg = (ph.precision ? arg.substring(0, ph.precision) : arg);
          break;
        case 't':
          arg = String(!!arg);
          arg = (ph.precision ? arg.substring(0, ph.precision) : arg);
          break;
        case 'T':
          arg = Object.prototype.toString.call(arg).slice(8, -1).toLowerCase();
          arg = (ph.precision ? arg.substring(0, ph.precision) : arg);
          break;
        case 'u':
          arg = parseInt(arg, 10) >>> 0;
          break;
        case 'v':
          arg = arg.valueOf();
          arg = (ph.precision ? arg.substring(0, ph.precision) : arg);
          break;
        case 'x':
          arg = (parseInt(arg, 10) >>> 0).toString(16);
          break;
        case 'X':
          arg = (parseInt(arg, 10) >>> 0).toString(16).toUpperCase();
          break;
      }
      if (re.json.test(ph.type)) {
        output += arg;
      }
      else {
        if (re.number.test(ph.type) && (!is_positive || ph.sign)) {
          sign = is_positive ? '+' : '-';
          arg = arg.toString().replace(re.sign, '');
        }
        else {
          sign = '';
        }
        pad_character = ph.pad_char ? ph.pad_char === '0' ? '0' : ph.pad_char.charAt(1) : ' ';
        pad_length = (parseInt(ph.width, 10) || 0) - (sign + arg).length;
        pad = ph.width ? (pad_length > 0 ? pad_character.repeat(pad_length) : '') : '';
        output += ph.align ? sign + arg + pad : (pad_character === '0' ? sign + pad + arg : pad + sign + arg);
      }
    }
  }
  return output;
}

const sprintf_cache: {[_: string]: ParseTreeEntry[]} = {};

function sprintf_parse(fmt: string): ParseTreeEntry[] {
  if (sprintf_cache[fmt]) {
    return sprintf_cache[fmt];
  }

  let _fmt = fmt, match;
  const parse_tree: ParseTreeEntry[] = [];
  let arg_names = 0;
  while (_fmt) {
    if ((match = re.text.exec(_fmt)) !== null) {
      parse_tree.push(match[0]);
    }
    else if ((match = re.modulo.exec(_fmt)) !== null) {
      parse_tree.push('%');
    }
    else if ((match = re.placeholder.exec(_fmt)) !== null) {
      let keys: string[]|undefined;
      if (match[2]) {
        arg_names |= 1;
        const field_list = [];
        let replacement_field = match[2];
        let field_match: RegExpExecArray|null = null;
        if ((field_match = re.key.exec(replacement_field)) !== null) {
          field_list.push(field_match[1]);
          while ((replacement_field = replacement_field.substring(field_match[0].length)) !== '') {
            if ((field_match = re.key_access.exec(replacement_field)) !== null) {
              field_list.push(field_match[1]);
            }
            else if ((field_match = re.index_access.exec(replacement_field)) !== null) {
              field_list.push(field_match[1]);
            }
            else {
              throw new SyntaxError('[sprintf] failed to parse named argument key');
            }
          }
        }
        else {
          throw new SyntaxError('[sprintf] failed to parse named argument key');
        }
        keys = field_list;
      }
      else {
        arg_names |= 2;
      }
      if (arg_names === 3) {
        throw new Error('[sprintf] mixing positional and named placeholders is not (yet) supported');
      }

      parse_tree.push(
        {
          placeholder: match[0],
          param_no:    parseInt(match[1]) || undefined,
          keys:        keys,
          sign:        match[3],
          pad_char:    match[4],
          align:       match[5],
          width:       match[6],
          precision:   parseInt(match[7]) || undefined,
          type:        match[8]
        }
      );
    }
    else {
      throw new SyntaxError('[sprintf] unexpected placeholder');
    }
    _fmt = _fmt.substring(match[0].length);
  }
  sprintf_cache[fmt] = parse_tree;
  return parse_tree;
}
