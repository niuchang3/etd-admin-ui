import { defineStore } from "pinia";
import { ref } from "vue";

const breadcrumbStore = defineStore('breadcrumb',() =>{
    
    const data = ref([''])

    const add = (value:string) =>{
        data.value.push(value);
    }
    const reset = ()=>{
        data.value=[];
    }

    return {
        data,add,reset
    }
},{
    persist:{
        storage:sessionStorage
    }
})


export default breadcrumbStore;