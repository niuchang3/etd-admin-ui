import { defineStore } from "pinia";
import { ref } from "vue";

// 管理当前页面的面包屑文本。
const breadcrumbStore = defineStore('breadcrumb',() =>{
    
    const data = ref([''])

    // 向当前面包屑末尾追加一级。
    const add = (value:string) =>{
        data.value.push(value);
    }
    // 进入新页面前清空旧面包屑。
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
