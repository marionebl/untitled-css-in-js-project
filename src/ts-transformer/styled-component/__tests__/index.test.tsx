import { Transformer } from 'ts-transformer-testing-library';
import pkg from '../../../../package.json';
import styledComponentTransformer from '../index';

jest.mock('../../utils/identifiers');

const transformer = new Transformer()
  .addTransformer(styledComponentTransformer)
  .addMock({
    name: 'react',
    content: 'export const useState: any = {}; export default () => {} as any;',
  })
  .addMock({ name: pkg.name, content: `export const styled: any = () => null` })
  .setFilePath('/index.tsx');

describe('styled component transformer', () => {
  it('should replace object literal styled component with component', () => {
    const actual = transformer.transform(`
      import { styled } from '${pkg.name}';
      const ListItem = styled.div({
        fontSize: '20px',
      });
    `);

    expect(actual).toInclude(
      'const ListItem = props => <><style>.test-class{font-size:20px;}</style><div {...props} className='
    );
  });

  it('should not pass down invalid html attributes to the node', () => {
    const actual = transformer.transform(`
      import { styled } from '${pkg.name}';
      const ListItem = styled.div({
        fontSize: props => props.textSize,
      });
    `);

    expect(actual).toInclude('({ textSize, ...props }) =>');
    expect(actual).toInclude('"--textSize-test-css-variable": textSize');
  });

  xit('should compose using a previously created component', () => {
    const actual = transformer.transform(`
      import { styled } from '${pkg.name}';

      const MyButton = ({ children, ...props }: any) => <button {...props}>{children}</button>

      const ListItem = styled(MyButton)({
        fontSize: '20px',
      });
    `);

    expect(actual).toInclude('<MyButton {...props} className');
  });

  it('should remove styled import', () => {
    const actual = transformer.transform(`
      import { styled } from '${pkg.name}';
      const ListItem = styled.div({
        fontSize: '20px',
      });
    `);

    expect(actual).not.toInclude(`import { styled } from '${pkg.name}';`);
  });

  it('should replace string literal styled component with component', () => {
    const actual = transformer.transform(`
      import { styled } from '${pkg.name}';
      const ListItem = styled.div\`
        font-size: 20px;
      \`;
    `);

    expect(actual).toInclude(
      'const ListItem = props => <><style>.test-class{font-size:20px;}</style><div {...props} className'
    );
  });

  it('should add react default import if missing', () => {
    const actual = transformer.transform(`
      import { styled } from '${pkg.name}';
      const ListItem = styled.div\`
        font-size: 20px;
      \`;
    `);

    expect(actual).toInclude('import React from "react";');
  });

  it('should add react default import if it only has named imports', () => {
    const actual = transformer.transform(`
      import { useState } from 'react';
      import { styled } from '${pkg.name}';
      const ListItem = styled.div\`
        font-size: 20px;
      \`;
    `);

    expect(actual).toInclude('import React, { useState } from "react";');
  });

  it('should spread down props to element', () => {
    const actual = transformer.transform(`
      import { styled } from '${pkg.name}';

      const ListItem = styled.div\`
        font-size: 20px;
      \`;
    `);

    expect(actual).toInclude('<div {...props}');
  });

  it('should do nothing if react default import is already defined', () => {
    const actual = transformer.transform(`
      import React from 'react';
      import { styled } from '${pkg.name}';
      const ListItem = styled.div\`
        font-size: 20px;
      \`;
    `);

    expect(actual).toInclude('import React from "react";');
  });

  it('should concat class name prop if defined', () => {
    const actual = transformer.transform(`
      import { styled } from '${pkg.name}';
      const ListItem = styled.div\`
        font-size: 20px;
      \`;
    `);

    expect(actual).toInclude(
      `className={\"test-class\" + (props.className ? \" \" + props.className : \"\")}`
    );
  });

  describe('using a string literal', () => {
    it('should respect missing units', () => {
      const actual = transformer.transform(`
        import { styled } from '${pkg.name}';
        const ListItem = styled.div\`
          font-size: 12;
        \`;
      `);

      expect(actual).toInclude('<style>.test-class{font-size:12;}</style>');
    });

    it('should not pass down invalid html attributes to the node when property has a suffix', () => {
      const actual = transformer.transform(`
        import { styled } from '${pkg.name}';
        const ListItem = styled.div\`
          font-size: \${props => props.textSize}px;
        \`;
      `);

      expect(actual).toInclude(
        '<style>.test-class{font-size:var(--textSize-test-css-variable);}</style>'
      );
      expect(actual).toInclude('({ textSize, ...props }) =>');
      expect(actual).toInclude('"--textSize-test-css-variable": textSize + "px"');
    });

    it('should persist suffix of dynamic property value into inline styles', () => {
      const actual = transformer.transform(`
        import { styled } from '${pkg.name}';

        const fontSize = 20;

        const ListItem = styled.div\`
          font-size: \${fontSize}px;
        \`;
      `);

      expect(actual).toInclude(
        'style={{ ...props.style, "--fontSize-test-css-variable": fontSize + "px" }}'
      );
      expect(actual).toInclude(
        '<style>.test-class{font-size:var(--fontSize-test-css-variable);}</style>'
      );
    });

    it('should persist suffix of dynamic property value into inline styles when missing a semi colon', () => {
      const actual = transformer.transform(`
        import { styled } from '${pkg.name}';

        const fontSize = 20;

        const ListItem = styled.div\`
          font-size: \${fontSize}px
        \`;
      `);

      expect(actual).toInclude('"--fontSize-test-css-variable": fontSize + "px" }}');
      expect(actual).toInclude(
        '<style>.test-class{font-size:var(--fontSize-test-css-variable);}</style>'
      );
    });

    it('should transform no template string literal', () => {
      const actual = transformer.transform(`
        import { styled } from '${pkg.name}';

        const ListItem = styled.div\`
          font-size: 20px;
        \`;
      `);

      expect(actual).toInclude('<style>.test-class{font-size:20px;}</style>');
    });

    it('should transform template string literal with string variable', () => {
      const actual = transformer.transform(`
        import { styled } from '${pkg.name}';

        const fontSize = '20px';

        const ListItem = styled.div\`
          font-size: \${fontSize};
        \`;
      `);

      expect(actual).toInclude(
        '<style>.test-class{font-size:var(--fontSize-test-css-variable);}</style>'
      );
    });

    it('should transform template string literal with numeric variable', () => {
      const actual = transformer.transform(`
        import { styled } from '${pkg.name}';

        const margin = 0;

        const ListItem = styled.div\`
          margin: \${margin};
        \`;
      `);

      expect(actual).toInclude(
        '<style>.test-class{margin:var(--margin-test-css-variable);}</style>'
      );
    });

    it('should transform template string literal with prop reference', () => {
      const actual = transformer.transform(`
        import { styled } from '${pkg.name}';

        const ListItem = styled.div\`
          color: \${props => props.color};
        \`;
      `);

      expect(actual).toInclude('<style>.test-class{color:var(--color-test-css-variable);}</style>');
      expect(actual).toInclude('"--color-test-css-variable": props.color }}');
    });

    it('should transform template string literal with string import', () => {
      const actual = transformer.addSource({
        path: '/fonts.ts',
        contents: 'export const fontSize = "20px";',
      }).transform(`
        import { styled } from '${pkg.name}';
        import { fontSize } from './fonts';

        const ListItem = styled.div\`
          font-size: \${fontSize};
        \`;
      `);

      expect(actual).toInclude(
        '<style>.test-class{font-size:var(--fontSize-test-css-variable);}</style>'
      );
    });

    it('should transform template string literal with obj variable', () => {
      const actual = transformer.transform(`
        import { styled } from '${pkg.name}';

        const h200 = { fontSize: '12px' };

        const ListItem = styled.div\`
          font-size: \${h200};
        \`;
      `);

      expect(actual).toInclude('<style>.test-class{font-size: font-size:12px;}</style>');
    });

    it('should transform template string literal with obj import', () => {
      const actual = transformer.addSource({
        path: '/typo.ts',
        contents: `export const h200 = { fontSize: '12px' };`,
      }).transform(`
        import { styled } from '${pkg.name}';
        import { h200 } from './typo';

        const ListItem = styled.div\`
          font-size: \${h200};
        \`;
      `);

      expect(actual).toInclude('<style>.test-class{font-size: font-size:12px;}</style>');
    });

    it('should reference identifier pointing to a call expression if it returns simple value', () => {
      const actual = transformer.transform(`
        import { styled } from '${pkg.name}';

        const em = (str: string) => str;
        const color = em('blue');

        const ListItem = styled.div\`
          color: \${color};
        \`;
      `);

      expect(actual).toInclude('<style>.test-class{color:var(--color-test-css-variable);}</style>');
      expect(actual).toInclude('"--color-test-css-variable": color }}>');
    });

    it('should inline call if it returns simple value', () => {
      const actual = transformer.transform(`
        import { styled } from '${pkg.name}';

        const em = (str: string) => str;

        const ListItem = styled.div\`
          color: \${em('blue')};
        \`;
      `);

      expect(actual).toInclude('<style>.test-class{color:var(--em-test-css-variable);}</style>');
      expect(actual).toInclude('"--em-test-css-variable": em(\'blue\') }}>');
    });

    it.todo('should transform template string literal with array variable');

    it.todo('should transform template string literal with array import');

    it('should transform template string with no argument arrow function variable', () => {
      const actual = transformer.transform(`
        import { styled } from '${pkg.name}';

        const mixin = () => ({ color: 'red' });

        const ListItem = styled.div\`
          \${mixin()};
        \`;
      `);

      expect(actual).toInclude('<style>.test-class{color:red;}</style>');
    });

    it('should transform template string with no argument arrow function import', () => {
      const actual = transformer.addSource({
        path: '/mixin.ts',
        contents: "export const mixin = () => ({ color: 'red' });",
      }).transform(`
        import { styled } from '${pkg.name}';
        import { mixin } from './mixin';

        const ListItem = styled.div\`
          \${mixin()};
        \`;
      `);

      expect(actual).toInclude('<style>.test-class{color:red;}</style>');
    });

    it('should transform template string with no argument function variable', () => {
      const actual = transformer.transform(`
        import { styled } from '${pkg.name}';

        function mixin() {
          return { color: 'red' };
        }

        const ListItem = styled.div\`
          \${mixin()};
        \`;
      `);

      expect(actual).toInclude('<style>.test-class{color:red;}</style>');
    });

    it('should transform template string with no argument function import', () => {
      const actual = transformer.addSource({
        path: '/func-mixin.ts',
        contents: `
          export function mixin() {
            return { color: 'red' };
          }
        `,
      }).transform(`
        import { styled } from '${pkg.name}';
        import { mixin } from './func-mixin';

        const ListItem = styled.div\`
          \${mixin()};
        \`;
      `);

      expect(actual).toInclude('<style>.test-class{color:red;}</style>');
    });

    it.todo('should transform template string with argument function variable');

    it.todo('should transform template string with argument function import');

    it.todo('should transform template string with argument arrow function variable');

    it.todo('should transform template string with argument arrow function import');
  });

  describe('using an object literal', () => {
    it('should respect the definition of pseudo element content ala emotion with double quotes', () => {
      const actual = transformer.transform(`
        import { styled } from '${pkg.name}';
        const ListItem = styled.div({
          ':after': {
            content: '""',
          },
        });
      `);

      expect(actual).toInclude('<style>.test-class:after{content:"";}</style>');
    });

    it('should respect the definition of pseudo element content ala emotion with single quotes', () => {
      const actual = transformer.transform(`
        import { styled } from '${pkg.name}';
        const ListItem = styled.div({
          ':after': {
            content: "''",
          },
        });
      `);

      expect(actual).toInclude("<style>.test-class:after{content:'';}</style>");
    });

    it('should respect the definition of pseudo element content ala styled components with no content', () => {
      const actual = transformer.transform(`
        import { styled } from '${pkg.name}';
        const ListItem = styled.div({
          ':after': {
            content: '',
          },
        });
      `);

      expect(actual).toInclude('<style>.test-class:after{content:"";}</style>');
    });

    it('should respect the definition of pseudo element content ala styled components with content', () => {
      const actual = transformer.transform(`
        import { styled } from '${pkg.name}';
        const ListItem = styled.div({
          ':after': {
            content: '😎',
          },
        });
      `);

      expect(actual).toInclude('<style>.test-class:after{content:"😎";}</style>');
    });

    it('should append "px" on numeric literals if missing', () => {
      const actual = transformer.transform(`
        import { styled } from '${pkg.name}';
        const ListItem = styled.div({
          fontSize: 12,
        });
      `);

      expect(actual).toInclude('<style>.test-class{font-size:12px;}</style>');
    });

    it('should not pass down invalid html attributes to the node when property has a suffix', () => {
      const actual = transformer.transform(`
        import { styled } from '${pkg.name}';
        const ListItem = styled.div({
          fontSize: props => \`\${props.textSize}px\`,
        });
      `);

      expect(actual).toInclude(
        '<style>.test-class{font-size:var(--textSize-test-css-variable);}</style>'
      );
      expect(actual).toInclude('({ textSize, ...props }) =>');
      expect(actual).toInclude('"--textSize-test-css-variable": `${textSize}px`');
    });

    it('should not pass down invalid html attributes to the node when property has a suffix when func in template literal', () => {
      const actual = transformer.transform(`
        import { styled } from '${pkg.name}';
        const ListItem = styled.div({
          fontSize: \`\${props => props.textSize}px\`,
        });
      `);

      expect(actual).toInclude(
        '<style>.test-class{font-size:var(--textSize-test-css-variable);}</style>'
      );
      expect(actual).toInclude('({ textSize, ...props }) =>');
      expect(actual).toInclude('"--textSize-test-css-variable": textSize + "px"');
    });

    it('should persist suffix of dynamic property value into inline styles', () => {
      const actual = transformer.transform(`
        import { styled } from '${pkg.name}';

        const fontSize = 20;

        const ListItem = styled.div({
          fontSize: \`\${props => props.fontSize}px\`,
        });
      `);

      expect(actual).toInclude('"--fontSize-test-css-variable": props.fontSize + "px" }}');
      expect(actual).toInclude(
        '<style>.test-class{font-size:var(--fontSize-test-css-variable);}</style>'
      );
    });

    it('should transform object with simple values', () => {
      const actual = transformer.transform(`
        import { styled } from '${pkg.name}';

        const ListItem = styled.div({
          color: 'blue',
          margin: 0,
        });
      `);

      expect(actual).toInclude('<style>.test-class{color:blue;margin:0;}</style>');
    });

    it('should transform object with nested object into a selector', () => {
      const actual = transformer.transform(`
        import { styled } from '${pkg.name}';

        const ListItem = styled.div({
          ':hover': {
            color: 'blue',
            margin: 0,
          },
        });
      `);

      expect(actual).toInclude('<style>.test-class:hover{color:blue;margin:0;}</style>');
    });

    it('should reference identifier pointing to a call expression if it returns simple value', () => {
      const actual = transformer.transform(`
        import { styled } from '${pkg.name}';

        const em = (str: string) => str;
        const color = em('blue');

        const ListItem = styled.div({
          color,
        });
      `);

      expect(actual).toInclude('<style>.test-class{color:var(--color-test-css-variable);}</style>');
      expect(actual).toInclude('"--color-test-css-variable": color }}>');
    });

    it('should inline call if it returns simple value', () => {
      const actual = transformer.transform(`
        import { styled } from '${pkg.name}';

        const em = (str: string) => str;

        const ListItem = styled.div({
          color: em('blue'),
        });
      `);

      expect(actual).toInclude('<style>.test-class{color:var(--color-test-css-variable);}</style>');
      expect(actual).toInclude('"--color-test-css-variable": em(\'blue\') }}>');
    });

    it('should transform template object with string variable', () => {
      const actual = transformer.transform(`
        import { styled } from '${pkg.name}';

        const color = 'blue';

        const ListItem = styled.div({
          color,
        });
      `);

      expect(actual).toInclude('<style>.test-class{color:var(--color-test-css-variable);}</style>');
      expect(actual).toInclude('"--color-test-css-variable": color }}>');
    });

    it('should transform template object with prop reference', () => {
      const actual = transformer.transform(`
        import { styled } from '${pkg.name}';

        const ListItem = styled.div({
          color: props => props.color,
        });
      `);

      expect(actual).toInclude('<style>.test-class{color:var(--color-test-css-variable);}</style>');
      expect(actual).toInclude('"--color-test-css-variable": props.color }}');
    });

    it('should transform object spread from variable', () => {
      const actual = transformer.transform(`
        import { styled } from '${pkg.name}';

        const h100 = { fontSize: '12px' };

        const ListItem = styled.div({
          ...h100,
        });
      `);

      expect(actual).toInclude('<style>.test-class{font-size:12px;}</style>');
    });

    it('should transform object spread from import', () => {
      const actual = transformer.addSource({
        path: '/tip.ts',
        contents: `export const h100 = { fontSize: '12px' };`,
      }).transform(`
        import { styled } from '${pkg.name}';
        import { h100 } from './tip';

        const ListItem = styled.div({
          ...h100,
        });
      `);

      expect(actual).toInclude('<style>.test-class{font-size:12px;}</style>');
    });

    it('should transform object with string variable', () => {
      const actual = transformer.transform(`
        import { styled } from '${pkg.name}';

        const color = 'blue';

        const ListItem = styled.div({
          color: color,
        });
      `);

      expect(actual).toInclude('<style>.test-class{color:var(--color-test-css-variable);}</style>');
      expect(actual).toInclude('"--color-test-css-variable": color }}');
    });

    it('should transform object with string import', () => {
      const actual = transformer.addSource({
        path: '/colors.ts',
        contents: `export const color = 'blue';`,
      }).transform(`
        import { styled } from '${pkg.name}';
        import { color } from './colors';

        const ListItem = styled.div({
          color,
        });
      `);

      expect(actual).toInclude('<style>.test-class{color:var(--color-test-css-variable);}</style>');
      expect(actual).toInclude('"--color-test-css-variable": color }}');
    });

    it('should transform object with obj variable', () => {
      const actual = transformer.transform(`
        import { styled } from '${pkg.name}';

        const hover = { color: 'red' };

        const ListItem = styled.div({
          fontSize: '20px',
          ':hover': hover,
        });
      `);

      expect(actual).toInclude(
        '<style>.test-class{font-size:20px;}.test-class:hover{color:red;}</style>'
      );
    });

    it('should transform object with obj import', () => {
      const actual = transformer.addSource({
        contents: `export const hover = { color: 'red' };`,
        path: './mixins.tsx',
      }).transform(`
        import { styled } from '${pkg.name}';
        import { hover } from './mixins';

        const ListItem = styled.div({
          fontSize: '20px',
          ':hover': hover,
        });
      `);

      expect(actual).toInclude(
        '<style>.test-class{font-size:20px;}.test-class:hover{color:red;}</style>'
      );
    });

    it.todo('should transform object with array variable');

    it.todo('should transform object with array import');

    it('should transform object with no argument arrow function variable', () => {
      const actual = transformer.transform(`
        import { styled } from '${pkg.name}';

        const mixin = () => ({ color: 'red' });

        const ListItem = styled.div({
          ...mixin(),
        });
      `);

      expect(actual).toInclude('<style>.test-class{color:red;}</style>');
    });

    it('should transform object with no argument arrow function import', () => {
      const actual = transformer.addSource({
        path: '/mixin.ts',
        contents: "export const mixin = () => ({ color: 'red' });",
      }).transform(`
        import { styled } from '${pkg.name}';
        import { mixin } from './mixin';

        const ListItem = styled.div({
          ...mixin(),
        });
      `);

      expect(actual).toInclude('<style>.test-class{color:red;}</style>');
    });

    it('should transform object with no argument function variable', () => {
      const actual = transformer.transform(`
        import { styled } from '${pkg.name}';

        function mixin() {
          return { color: 'red' };
        }

        const ListItem = styled.div({
          ...mixin(),
        });
      `);

      expect(actual).toInclude('<style>.test-class{color:red;}</style>');
    });

    it('should transform object with no argument function import', () => {
      const actual = transformer.addSource({
        path: '/mixin.ts',
        contents: `
          export function mixin() {
            return { color: 'red' };
          }
        `,
      }).transform(`
        import { styled } from '${pkg.name}';
        import { mixin } from './mixin';

        const ListItem = styled.div({
          ...mixin(),
        });
      `);

      expect(actual).toInclude('<style>.test-class{color:red;}</style>');
    });

    it.todo('should transform object with argument function variable');

    it.todo('should transform object with argument function import');

    it.todo('should transform object with argument arrow function variable');

    it.todo('should transform object with argument arrow function import');
  });
});
