<script>
export default {
  name: 'AddPlugin',
  methods: {
    addPlugin () {
      this.$store.dispatch('PLUGIN_ADD')
    }
  }
}
</script>

<template>
  <div @click="addPlugin">
    Add
  </div>
</template>
