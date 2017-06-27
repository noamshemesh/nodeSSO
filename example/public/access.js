function accessAuth(authPath) {
  fetch(`https://access.localtunnel.me${authPath}`, { credentials: 'include' })
    .then(res => res.json())
    .then(body => {
      if (body && body.next) window.location = body.next
    })
}
