<script setup>
import * as gitVersionData from '../git-version.json';
const gitVersion = gitVersionData;
</script>

<template>
  <footer class="footer">
    <div class="row">
      <div class="col-12">
        Copyright &copy; 2025 Melexis. All rights reserved.
        &nbsp; &nbsp;
        <router-link :to="{ name: 'terms-of-use' }">
          Terms of use
        </router-link>
        &nbsp; &nbsp;
        Melexis Compact Master UI v{{ gitVersion.semverString }}.
      </div>
    </div>
  </footer>
</template>

<style scoped>
  .footer{
    position: fixed;
    padding: 17px;
    height: 60px;
    width:100%;
    bottom:0%;
    color: #FFF;
    background-color: #00354b;
    text-align: center;
  }
  a:link{
    text-decoration: none;
    color: #FFF;
  }
  a:active{
    text-decoration: none;
    color: #FFF;
  }
  a:hover{
    text-decoration: underline;
    color: #FFF;
  }
  a:visited{
    text-decoration: none;
    color: #FFF;
  }
</style>
