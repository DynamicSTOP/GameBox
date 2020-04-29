<script>
import '@/scss/main.scss'
import { mapGetters } from 'vuex'

export default {
  name: 'App',
  computed: {
    ...mapGetters(['isLoading'])
  },
  created () {
    this.$store.dispatch('CONFIG_REQUEST')
  }
}
</script>

<template>
  <div>
    <div v-if="isLoading">
      Loading...
    </div>
    <router-view v-else />
  </div>
</template>
