# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Malay (`ms`) translation, with an EN / BM language switcher on the login page, the home header and the editor header; the choice is saved in localStorage
- All editor text is translatable: properties panel, text toolbar, expression editor, AI assistant, dialogs, canvas tooltips and messages
- DejaVu Sans, DejaVu Serif and DejaVu Sans Mono are bundled with the app (`public/fonts/dejavu/`), matching the fonts JasperReports embeds in PDFs

### Changed
- English is now the default language, instead of following the browser language
- The default report font is now DejaVu Sans (was Noto Sans SC / Noto Serif SC)
- Mock preview data is English-only (names, addresses, companies, fictional 555 phone numbers)

### Deprecated

### Removed
- Chinese translation (`zh`), the Chinese help dialog and all Chinese text, comments and sample data
- Chinese fonts from the font list (Noto SC, PingFang, Microsoft YaHei, SimHei, SimSun, STSong, WenQuanYi, Droid Sans Fallback)

### Fixed

### Security

## [0.4.0] - 2026-01-21

### Added
- Implemented multi-language support and added translations
- Added English versions of the help and donation dialogs, improving internationalization
- Added sub-dataset parsing
- Integrated the Naive UI framework and refactored UI components
- Added table component support and drag-and-drop column reordering
- Added support for adding table columns from a dataset
- Added Dependabot configuration for dependency updates
- Added an English README

### Changed
- Removed unused CSS and improved component structure
- Reorganized style code and removed unused CSS rules
- Updated the project rules document with a rule to write commit messages in English
- Updated dependencies: @tauri-apps/cli, @types/node, vue-tsc, @vitejs/plugin-vue, vue
- Updated project documentation and the changelog
- Updated and removed static asset files

### Fixed
- Fixed variable formatting in translation strings
- Fixed parsing of JRXML files with namespaces
- Fixed a namespace issue with CSS selectors in JRXML parsing
- Updated the placeholder format in expression hint text
- Fixed field name display in expression hints and added escaping configuration
- Updated the default image URL path
- Removed the background color of the image preview area

### Security

## [0.3.0] - 2026-01-20

### Added
- Added preview server settings
- Added report parameter management
- Added image preview with a default height
- Implemented multi-language support with a language switcher
- Improved the design canvas and paper size support
- Added a modal dialog component

### Changed
- Updated tests to use i18n keys and more precise selectors
- Removed image path display and calculation logic
- Improved default text display
- Replaced the `any[]` type of `bands` in DesignerCanvas with the `Band` type
- Removed unused dependencies
- Bumped the app version to 0.2.1

### Fixed
- Fixed italic font rendering for CJK text

### Security

## [0.2.1] - 2026-01-19

### Fixed
- Fixed italic font rendering for CJK text

## [0.2.0] - 2026-01-19

### Added
- Automatic data field creation: a field is added when a text element's expression references a field that doesn't exist
- Added delete buttons to the report element list
- Support for the Command key as an alternative to Ctrl on macOS
- Image elements support the `imageExpression` attribute, which can be set in the properties panel

### Changed

### Deprecated

### Removed

### Fixed
- Fixed expressions not showing in the properties panel
- Avoided a duplicate confirmation dialog when deleting elements
- Fixed TypeScript syntax errors
- Fixed the default behaviour of copy/paste shortcuts in input fields

### Security

## [0.1.0] - 2026-01-15

### Added
- Project initialization
- Vue 3 + TypeScript foundation
- PDF element design components
- JRXML generation
