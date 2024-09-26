# Melexis Compact Master (MCM) User Interface

This project assembles the Melexis Compact Master (MCM) user interface which can be used to configure and
control the MCM using the USB interface from within a web browser through WebUSB.

The MCM is a hardware platform which is built upon the [Espressif](https://www.espressif.com/) ESP32 and provides
an easy to use evaluation setup for different [Melexis](https://www.melexis.com) products.

The first evaluation board based on this platform is the MCM-81339.

<img src="static/MCM-81339.png" width="30%">

For a deployment of this Web UI check [Github Pages](https://melexis.github.io/mcm-ui/)

## Contributing

This is an open source project and we are very happy to accept community contributions.

There is a [Contribution guide](CONTRIBUTING.md) available if you would like to get involved in development of the WebUI.

### Install a Development Environment

Start by cloning this repository and making sure you have [npm](https://www.npmjs.com/) installed via your favorite package manager.

Next you can install all requirements by running below command in the project root.

```sh
$ npm install
```

#### Compile and Hot-Reload for Development

```sh
$ npm run dev
```

#### Compile and Minify for Production

```sh
$ npm run build
```

#### Lint with [ESLint](https://eslint.org/)

```sh
$ npm run lint
```

## Issues and New Features

In case you have any problems with usage of the WebUI, please open an issue on [Github](https://github.com/melexis/mcm-ui/issues).
Provide as much valid information as possible, as this will help us to resolve Issues faster. We would also like to hear your
suggestions about new features which would improve your MCM experiences.

## Licensing

See the LICENSE file for licensing information.
