<script>
import '@/scss/main.scss'
import { mapGetters } from 'vuex'

export default {
  name: 'App',
  computed: {
    ...mapGetters(['isLoading'])
  }
}
</script>

<template>
  <div>
    <div v-if="isLoading">
      Loading...
    </div>
    <router-view />
  </div>
</template>
