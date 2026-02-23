<script setup>
import { useRouter } from 'vue-router';
import { useUsbTransport } from '../js/usbTransport';

const router = useRouter();
const transport = useUsbTransport();

function computedTitle () {
  if (transport.isSelected()) {
    return transport.getProductName();
  }
  return 'Melexis Compact transport';
}

function computedHasI2c () {
  if ((transport.getProductName() === 'Melexis Compact Master 81339') ||
      (transport.getProductName() === 'Melexis Compact Master 81349')) {
    return true;
  }
  return false;
}

function computedHasLin () {
  if (transport.getProductName() === 'Melexis Compact Master LIN') {
    return true;
  }
  return false;
}

function computedHasPpm () {
  if (transport.getProductName() === 'Melexis Compact Master LIN') {
    return true;
  }
  return false;
}

function computedHasPwm () {
  if ((transport.getProductName() === 'Melexis Compact Master 81339') ||
      (transport.getProductName() === 'Melexis Compact Master 81349')) {
    return true;
  }
  return false;
}

function computedHasUart () {
  if ((transport.getProductName() === 'Melexis Compact Master 81339') ||
      (transport.getProductName() === 'Melexis Compact Master 81349')) {
    return true;
  }
  return false;
}

function disconnect () {
  transport.disconnect()
    .then(() => router.push('/webapp'));
}
</script>

<template>
  <nav class="navbar navbar-expand-lg navbar-dark sticky-top">
    <div class="container">
      <router-link
        class="navbar-brand text-decoration-none"
        to="/webapp"
      >
        {{ computedTitle() }}
      </router-link>
      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#navbarContent"
        aria-controls="navbarContent"
        aria-expanded="false"
      >
        <span class="navbar-toggler-icon" />
      </button>
      <div
        v-if="transport.isSelected()"
        id="navbarContent"
        class="collapse navbar-collapse"
      >
        <ul class="navbar-nav ms-auto">
          <li
            v-if="computedHasI2c()"
            class="nav-item dropdown active"
          >
            <a
              class="nav-link dropdown-toggle"
              href="#"
              role="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              I2C
            </a>
            <ul class="dropdown-menu">
              <li>
                <router-link
                  class="dropdown-item"
                  :to="{ name: 'i2c-detect' }"
                >
                  detect
                </router-link>
              </li>
              <li>
                <router-link
                  class="dropdown-item"
                  :to="{ name: 'i2c-device' }"
                >
                  device
                </router-link>
              </li>
            </ul>
          </li>
          <li
            v-if="computedHasLin()"
            class="nav-item dropdown active"
          >
            <a
              class="nav-link dropdown-toggle"
              href="#"
              role="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              LIN
            </a>
            <ul class="dropdown-menu">
              <li>
                <router-link
                  class="dropdown-item"
                  :to="{ name: 'lin-commander' }"
                >
                  commander
                </router-link>
              </li>
            </ul>
          </li>
          <li
            v-if="computedHasPpm()"
            class="nav-item dropdown active"
          >
            <a
              class="nav-link dropdown-toggle"
              href="#"
              role="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              PPM
            </a>
            <div class="dropdown-menu">
              <li>
                <router-link
                  class="dropdown-item"
                  :to="{ name: 'ppm-one2one' }"
                >
                  one2one programmer
                </router-link>
              </li>
            </div>
          </li>
          <li
            v-if="computedHasPwm()"
            class="nav-item dropdown active"
          >
            <a
              class="nav-link dropdown-toggle"
              href="#"
              role="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              PWM
            </a>
            <ul class="dropdown-menu">
              <li>
                <router-link
                  class="dropdown-item"
                  :to="{ name: 'pwm-controller' }"
                >
                  controller
                </router-link>
              </li>
            </ul>
          </li>
          <li
            v-if="computedHasUart()"
            class="nav-item dropdown active"
          >
            <a
              class="nav-link dropdown-toggle"
              href="#"
              role="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              UART
            </a>
            <ul class="dropdown-menu">
              <li>
                <router-link
                  class="dropdown-item"
                  :to="{ name: 'uart-bootloader' }"
                >
                  programmer
                </router-link>
              </li>
              <li>
                <router-link
                  class="dropdown-item"
                  :to="{ name: 'uart-terminal' }"
                >
                  terminal
                </router-link>
              </li>
            </ul>
          </li>
          <li class="nav-item dropdown active">
            <a
              id="navbarDropdown0"
              class="nav-link dropdown-toggle"
              href="#"
              role="button"
              data-bs-toggle="dropdown"
              aria-haspopup="true"
              aria-expanded="false"
            >
              System
            </a>
            <div
              class="dropdown-menu"
              aria-labelledby="navbarDropdown"
            >
              <li>
                <router-link
                  class="dropdown-item"
                  :to="{ name: 'system-details' }"
                >
                  details
                </router-link>
              </li>
              <li><hr class="dropdown-divider"></li>
              <li>
                <router-link
                  class="dropdown-item"
                  :to="{ name: 'system-config' }"
                >
                  configuration
                </router-link>
              </li>
              <li>
                <router-link
                  class="dropdown-item"
                  :to="{ name: 'system-upgrade' }"
                >
                  upgrade
                </router-link>
              </li>
              <li><hr class="dropdown-divider"></li>
              <li>
                <router-link
                  class="dropdown-item"
                  :to="{ name: 'system-reboot' }"
                >
                  reboot
                </router-link>
              </li>
            </div>
          </li>
          <a
            class="nav-link"
            href="#"
            role="button"
            @click="disconnect()"
          >
            Disconnect
          </a>
        </ul>
      </div>
    </div>
  </nav>
</template>

<style scoped>
  .navbar{
    background-image: radial-gradient(circle at 50% 0,#004159,#002839 59%);
/*    background-color: #00354b; */
    font-weight: bold;
    margin-bottom: 0px;
    padding-left:0
  }
  .nav-link {
    color: #fff;
  }
  .dropdown-menu.show{
    background-color: #00354b;
  }
  .dropdown-item{
    color: #fff;
    font-weight: bold;
  }
  .dropdown-item:hover {
    color: #00354b;
  }
  .dropdown-divider {
    border-color: #fff;
  }
</style>
