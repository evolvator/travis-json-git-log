# travis-json-git-log

Write json log into git repo.

[![NPM](https://img.shields.io/npm/v/travis-json-git-log.svg)](https://www.npmjs.com/package/travis-json-git-log)
[![Build Status](https://travis-ci.org/evolvator/travis-json-git-log.svg?branch=master)](https://travis-ci.org/evolvator/travis-json-git-log)

## Lifecycle

- clone repo
- find file
  - if exists, add data to file
  - if not exists, create file with data
- add, commit and push

## Usage

### As package

```js
var tjgl = require('travis-json-git-log').tjgl;

tjgl(
  // config required
  {
    data: [{ a: 1 }, { b: 2 }, { c: 3 }],
    // required object or json string
    // config.data || process.env.TJGL_DATA
    // if target file dont exists - just write into file
    // if target file contains object - then just `lodash.extend(file, data)`
    // if target file is array - then just push data, or concat with array-data
    
    branch: 'results',
    // branch name for save log.
    // config.branch || process.env.TJGL_BRANCH || 'results'
    
    repo_slug: 'user/repo',
    // used if repo exists  // branch name for save log.
    // config.repo_slug || process.env.TJGL_REPO_SLUG || process.env.TRAVIS_REPO_SLUG || undefined
    
    repo: 'http://github.com/user/repo.git',
    // used if repo_slug exists
    // config.repo || process.env.TJGL_REPO || `https://${config.auth}@github.com/${config.repo_slug}.git` || undefined
    
    auth: 'token',
    // git token or username:password
    // config.auth || process.env.TJGL_AUTH || undefined
    
    mute: false,
    // optional, default false
    // config.mute || process.env.TJGL_MUTE || false
    
    filename: `${new Date().valueOf()}`,
    // optional, default timestamp
    // config.filename || process.env.TJGL_FILENAME || process.env.TRAVIS_BUILD_ID || new Date().valueOf()

    error: undefined,
    // optional
    // if exists, stops execution with console log and callback
    // if repo or repo_slug+auth not founded, auto fill
    // config.error || process.env.TJGL_ERROR
  },
  // callback optional
  (error, context, config) => {},
);
```

### As CLI command

```sh
TJGL_DATA='[{"a":1}]' TJGL_REPO="https://github.com/evolvator/travis-json-git-log.git" node ./node_modules/travis-json-git-log
```
