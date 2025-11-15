import 'bootstrap/dist/css/bootstrap.min.css';
import './assets/melexis.css';

import { createApp } from 'vue';
import App from './App.vue';

import router from './router';
import axios from 'axios';
import VueAxios from 'vue-axios';

import { MasterPlugin } from './js/usbMaster';

import { library } from '@fortawesome/fontawesome-svg-core';
import { faLink, faLinkSlash, faEyeSlash, faEye, faPlay, faStop, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

import 'bootstrap/dist/js/bootstrap.min.js';

library.add(faLink, faLinkSlash, faEyeSlash, faEye, faPlay, faStop, faTrashCan);

const app = createApp(App);

app.component('FontAwesomeIcon', FontAwesomeIcon);

app.use(router);
app.use(VueAxios, axios);
app.use(MasterPlugin);

app.mount('#app');
