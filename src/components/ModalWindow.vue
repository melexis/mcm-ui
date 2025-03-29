<script setup>
const props = defineProps({
  show: Boolean
});
</script>

<template>
  <Transition name="modal">
    <div v-if="props.show" class="modal-mask">
      <div class="modal-container">
        <div class="modal-header">
          <h3>
            <slot name="header"></slot>
          </h3>
        </div>
        <div class="modal-body">
          <slot name="body"></slot>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" v-on:click="$emit('submit')">
            <slot name="buttonSubmit">Submit</slot>
          </button>
          &nbsp;&nbsp;
          <button class="btn btn-secondary" v-on:click="$emit('cancel')">
            <slot name="buttonCancel">Cancel</slot>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style>
  .modal-mask {
    position: fixed;
    z-index: 9998;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    transition: opacity 0.3s ease;
  }
  .modal-container {
    width: 300px;
    margin: auto;
    padding: 20px 30px;
    background-color: #fff;
    border-radius: 2px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.33);
    transition: all 0.3s ease;
  }
  .modal-header h3 {
    margin-top: 0;
  }
  .modal-body {
    margin: 20px 0;
  }
  .modal-enter-from {
    opacity: 0;
  }
  .modal-leave-to {
    opacity: 0;
  }
  .modal-enter-from .modal-container,
  .modal-leave-to .modal-container {
    -webkit-transform: scale(1.1);
    transform: scale(1.1);
  }
</style>
