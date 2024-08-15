var express = require('express');
var router = express.Router();
var productHelpers=require('../Helpers/product-helper')

const checkAdmin=(req,res,next)=>{
  if(req.session.admin){
    next()
  }else{
    res.redirect('/admin/admin-login')
  }
}
/* GET users listing. */
router.get('/',checkAdmin,async function (req, res, next) {
  await productHelpers.viewProducts().then((products)=>{
    const productWithIndex=products.map((product,index)=>
    ({...product,index:index+1}))
    res.render('admin/view-products',{admin:true,products:productWithIndex})
  })
});
router.get('/admin-login',(req,res)=>{
  res.render('admin/login',{adminLoginErr:req.session.adminLoginerr})
})
router.post('/admin-login',(req,res)=>{
  if(req.body.email==='rabi@gmail.com'&& req.body.password==='890'){
    req.session.admin=true
    req.session.adminLoginerr=null
    res.redirect('/admin')
  }else{
    req.session.adminLoginerr="Invalid username or password"
    res.redirect('/admin/admin-login')
  }
})
router.get('/logout',(req,res)=>{
  req.session.admin=false
  res.redirect('/admin')
})
router.get('/add-product',(req,res)=>{
  res.render('admin/add-product')
})
router.post('/add-product',async(req,res)=>{
  productHelpers.addProduct(req.body,(id)=>{
    const image=req.files.image
    image.mv('./public/images/product-images/'+id+'.jpg')
    res.redirect('/admin/add-product')
  })
})
router.get('/delete-product/:id',(req,res)=>{
  productHelpers.deleteProduct(req.params.id).then(()=>{
    res.redirect('/admin')
  })
})
router.get('/edit-product/:id',((req,res)=>{
  productHelpers.getProduct(req.params.id).then((product)=>{
    res.render('admin/edit-product',{product})
  })
}))
router.post('/edit-product/:id',(req,res)=>{
  productHelpers.editProduct(req.params.id,req.body).then(()=>{
    res.redirect('/admin')
    if(req.files.image){
      let image=req.files.image
    image.mv('./public/images/product-images/'+req.params.id+'.jpg')
    }
  })
})
module.exports = router;
