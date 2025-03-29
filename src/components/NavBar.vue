<script setup>
import { useRouter } from 'vue-router';
import { useMaster } from '../js/usbMaster';

const router = useRouter();
const master = useMaster();

function computedTitle () {
  if (master.isSelected()) {
    return 'Melexis Compact Master 81339';
  }
  return 'Melexis Compact Master';
}

function disconnect () {
  master.disconnect()
    .then(() => router.push('/webapp'));
}
</script>

<template>
  <nav class="navbar navbar-expand-lg navbar-dark sticky-top">
    <div class="container">
      <router-link
        class="navbar-brand text-decoration-none"
        to="/webapp">
        {{ computedTitle() }}
      </router-link>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarContent" aria-controls="navbarContent" aria-expanded="false">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="navbarContent" v-if="master.isSelected()">
        <ul class="navbar-nav ms-auto">
          <li class="nav-item dropdown active">
            <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
              UART
            </a>
            <ul class="dropdown-menu">
              <li>
                <router-link
                  class="dropdown-item"
                  :to="{ name: 'uart-bootloader' }">
                  bootloader
                </router-link>
              </li>
              <li>
                <router-link
                  class="dropdown-item"
                  :to="{ name: 'uart-terminal' }">
                  terminal
                </router-link>
              </li>
            </ul>
          </li>
          <li class="nav-item dropdown active">
            <a class="nav-link dropdown-toggle" href="#" id="navbarDropdown0" role="button" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
              System
            </a>
            <div class="dropdown-menu" aria-labelledby="navbarDropdown">
              <li>
                <router-link
                  class="dropdown-item"
                  :to="{ name: 'system-details' }">
                  details
                </router-link>
              </li>
              <li><hr class="dropdown-divider"></li>
              <li>
                <router-link
                  class="dropdown-item"
                  :to="{ name: 'system-config' }">
                  configuration
                </router-link>
              </li>
              <li>
                <router-link
                  class="dropdown-item"
                  :to="{ name: 'system-upgrade' }">
                  upgrade
                </router-link>
              </li>
              <li><hr class="dropdown-divider"></li>
              <li>
                <router-link
                  class="dropdown-item"
                  :to="{ name: 'system-reboot' }">
                reboot
                </router-link>
              </li>
            </div>
          </li>
          <a class="nav-link" href="#" role="button" @click="disconnect()">
            Disconnect
          </a>
        </ul>
      </div>
    </div>
  </nav>
</template>

<style scoped>
  .navbar{
    background-color: #00354b;
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
  .dropdown-menu>li>a:hover{
    color: #00354b;
    font-weight: bold;
  }
  .dropdown-divider {
    border-color: #fff;
  }
</style>
