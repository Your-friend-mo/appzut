<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script>
    var params = new URLSearchParams(window.location.search);
    var slug = params.get("slug");
    if (slug) {
      window.location.replace("app/" + encodeURIComponent(slug) + ".html");
    } else {
      window.location.replace("index.html");
    }
  </script>
</head>
<body></body>
</html>
