#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');

// Resolve the components.json: use an explicit arg, otherwise auto-detect the
// single pulled component set under .storyblok/components/<space>/components.json
// (so `yarn scaffold` works without needing $STORYBLOK_SPACE_ID in the shell).
function resolveSchemaPath() {
  const arg = process.argv[2];
  if (arg) return path.resolve(repoRoot, arg);

  const base = path.join(repoRoot, '.storyblok', 'components');
  const matches = fs.existsSync(base)
    ? fs
        .readdirSync(base)
        .map(dir => path.join(base, dir, 'components.json'))
        .filter(p => fs.existsSync(p))
    : [];

  if (matches.length === 0) {
    console.error(
      'No .storyblok/components/<space>/components.json found. Run `yarn sync` first.'
    );
    process.exit(1);
  }
  if (matches.length > 1) {
    console.warn(`Multiple component sets found; using ${matches[0]}`);
  }
  return matches[0];
}

const schema = JSON.parse(fs.readFileSync(resolveSchemaPath(), 'utf8'));

const generateContent = (schema) => {
  let result = Object.keys(schema.schema).map(key => ({
    name: key,
    type: schema.schema[key].type
  }));
  return result.map(blok => {
    switch (blok.type) {
      case 'text':
        return `<p>{blok.` + blok.name + `}</p>`
      case 'bloks':
        return `{blok.`+blok.name+` && blok.` +blok.name+ `.map(nestedBlok => <StoryblokComponent blok={nestedBlok} key={nestedBlok._uid} />)}`
      default:
        return `<p>{blok}</p>`
    }
  })

}
schema.components.forEach((componentSchema) => {
  let componentName = componentSchema.name;
  componentName = componentName.charAt(0).toUpperCase() + componentName.slice(1);

  let className = componentName+'Props'

  let filePath = componentSchema.is_nestable
    ? `./components/nestables/${componentName}.tsx`
    : `./components/content_types/${componentName}.tsx`;

  let directory = path.dirname(filePath);
  if (!fs.existsSync(directory)){
    fs.mkdirSync(directory);
  }

  if(fs.existsSync(filePath)) {
    console.log(`File ${componentName}.tsx already exists at ${filePath}. Skipping.`);
    return;
  }

  const component = `
    import { StoryblokComponent, storyblokEditable } from '@storyblok/react/rsc';
    import { ${componentName}Storyblok } from '../../types/component-types-sb';
    
    type ${className} = {
      blok: ${componentName}Storyblok
    }
    
    const ${componentName} = ({ blok }: ${className}) => (
      <section {...storyblokEditable(blok)}>
        <div>
          ` + generateContent(componentSchema).join('\n') +`
        </div>
      </section>
    )
    
    export default ${componentName};
  `;
  fs.writeFileSync(path.resolve('./', filePath), component);
  console.log(`File ${componentName}.tsx created at ${filePath}`);


});

