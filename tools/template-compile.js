const _ = require('lodash');
const glob = require('glob');
const fs = require('fs');
const path = require('path');
const commandLineArgs = require('command-line-args');

const optionDefinitions = [
  {name: 'sources', alias: 's', type: String},
  {name: 'context', alias: 'c', type: String},
];

const processTemplates = (sources, context) => {
  sources.forEach(source => {
    glob(`dist/${source}`, (err, matches) => {
      if (err) {
        console.log(`cannot compile sources for ${source}`);
        return;
      }
      matches.forEach(match => {
        try {
          _.runInContext();
          if (match.includes('.js')) {
            _.templateSettings = {
              interpolate: /<%[=\-]? (.+?) %>/g
            };
          }
          const file = fs.readFileSync(match, {encoding: 'UTF-8'});

          try {
            const template = _.template(file);
            const renderedContent = template(context);

            try {
              fs.writeFileSync(match, renderedContent);
            } catch (e) {
              console.log(`error writing to output '${match}': ${e}`);
            }
          } catch (e) {
            console.log(`error templating file '${match}': ${e}`);
          }
        } catch (e) {
          console.log(`cannot read from source '${match}'`);
          process.exit();
        }
      })
    });
  });
};

const templateCompile = () => {
  const options = commandLineArgs(optionDefinitions);

  if (!options.sources) {
    console.log('sources required');
    process.exit();
  }
  if (!options.context) {
    console.log('context required');
    process.exit();
  }

  const context = require(path.relative(__dirname, options.context));

  if (!context) {
    console.log(`cannot access context '${options.context}'`);
  }

  const sources = options.sources.split('|');

  processTemplates(sources, context);
};

templateCompile();
