<script setup lang="ts">
const doSomething = async () => {
  count.value++
  state.count++
  isActive.value = !isActive.value
  items.value.push({ message: 'Foo' + count.value })
}
const notDoSomething = async () => {
  count.value--
  state.count--
  isActive.value = !isActive.value
  items.value.pop()
}
const attrName = 'href'
const attrValue = '/'

import { ref, computed, reactive, watch } from 'vue'

const count = ref(0)

const state = reactive({ count: 0 })

const author = reactive({
  name: 'John Doe',
  books: [
    'Vue 2 - Advanced Guide',
    'Vue 3 - Basic Guide',
    'Vue 4 - The Mystery'
  ]
})

const hasPublishedBooks = computed(() => {
  return author.books.length > 0 ? 'Yes' : 'No'
})

const dateComputed = computed(() => {
  return new Date().toLocaleString()
})

const firstName = ref('John')
const lastName = ref('Doe')

const fullName = computed({
  // getter
  get() {
    return firstName.value + ' ' + lastName.value
  },
  // setter
  set(newValue) {
    // 注意：我们这里使用的是解构赋值语法
    [firstName.value, lastName.value] = newValue.split(' ')
  }
})

const isActive = ref(true)

const items = ref([
  { message: 'Foo1' },
  { message: 'Foo3' },
  { message: 'Foo5' },
  { message: 'Bar' }
])

watch(count, (newVal, oldVal) => {
  console.log(`count changed from ${oldVal} to ${newVal}`)
})
</script>

<template>
  <div class="about">
    <h1 :class="{ active: isActive }">This is an about page</h1>
    <a :[attrName]="attrValue" @click.prevent="doSomething">do something</a>
    <br />
    <a :[attrName]="attrValue" @click.prevent="notDoSomething">not do something</a>

    <ul>
      <li v-for="item in items" :key="item.message">
        {{ item.message }}
      </li>
    </ul>

    <p>count: {{ count }}</p>
    <p>state.count: {{ state.count }}</p>

    <p>Has published books:</p>
    <span>{{ hasPublishedBooks }}</span>

    <p>Date: {{ dateComputed }}</p>

    <p>Full name: {{ fullName }}</p>
    <p>First name: {{ firstName }}</p>
    <p>Last name: {{ lastName }}</p>
    <input v-model="fullName" @input="console.log(fullName)" />

  </div>
</template>

<style>
@media (min-width: 1024px) {
  .about {
    min-height: 100vh;
    display: flex;
    align-items: center;
  }
}
</style>
