<script>
import NavBar from './components/NavBar.vue';
import PageFooter from './components/PageFooter.vue';
export default {
  name: 'App',
  components: {
    NavBar,
    PageFooter
  }
};
</script>

<template>
  <div id="app">
    <NavBar />
    <div class="main">
      <div class="container">
        <router-view />
      </div>
    </div>
    <PageFooter />
  </div>
</template>

<style>
  #app {
    font-family: 'Lato';
  }
  p.normal {
    font-weight: 300;
  }
  p.thick {
    font-weight: 700;
  }
  h1, h2, h3, h4, h5, h6, .h1, .h2, .h3, .h4, .h5, .h6 {
    font-weight: 700;
  }
  .main{
    margin-bottom:60px
  }
</style>
