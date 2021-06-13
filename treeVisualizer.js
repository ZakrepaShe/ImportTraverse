import treeJson from './tree.js'

// Based on https://gist.github.com/robschmuecker/7880033
function makeTree(links) {
  const nodesByName = {};

  links.forEach(function (link) {
    const parent = nodeByName(link.source);
    const child = nodeByName(link.target);
    if (!parent.children) {
      parent.children = []
    }
    parent.children.push(child);
  });

  return links;

  function nodeByName(name) {
    return nodesByName[name] || (nodesByName[name] = {
      name: name,
    });
  }
}

function dndTree(treeData) {
  // Calculate total nodes, max label length
  var totalNodes = 0;
  var maxLabelLength = 0;
  // variables for drag/drop
  var selectedNode = null;
  var draggingNode = null;
  // panning variables
  var panSpeed = 200;
  var panBoundary = 20; // Within 20px from edges will pan when dragging.
  // Misc. variables
  var i = 0;
  var duration = 750;
  var root, panTimer, dragStarted, domNode, nodes, links;

  // size of the diagram
  var viewerWidth = document.documentElement.getBoundingClientRect().width;
  var viewerHeight = document.documentElement.getBoundingClientRect().height;

  var tree = d3.layout.tree()
    .size([viewerHeight, viewerWidth]);

  // define a d3 diagonal projection for use by the node paths later on.
  var diagonal = d3.svg.diagonal()
    .projection(function (d) {
      return [d.y, d.x];
    });
  var translateCoords;
  // A recursive helper function for performing some setup by walking through all nodes

  function visit(parent, visitFn, childrenFn) {
    if (!parent) return;

    visitFn(parent);

    var children = childrenFn(parent);
    if (children) {
      children.forEach((child)=>{
        visit(child, visitFn, childrenFn);
      })
    }
  }

  // Call visit function to establish maxLabelLength
  visit(treeData, function (d) {
    totalNodes++;
    maxLabelLength = Math.max(d.name.length, maxLabelLength);

  }, function (d) {
    return d.children && d.children.length > 0 ? d.children : null;
  });

  // sort the tree according to the node names

  function sortTree() {
    tree.sort(function (a, b) {
      return b.name.toLowerCase() < a.name.toLowerCase() ? 1 : -1;
    });
  }
  // Sort the tree initially incase the JSON isn't in a sorted order.
  sortTree();

  // TODO: Pan function, can be better implemented.

  function pan(domNode, direction) {
    var speed = panSpeed;
    var translateX, translateY, scaleX, scaleY, scale;
    if (panTimer) {
      clearTimeout(panTimer);
      translateCoords = d3.transform(svgGroup.attr("transform"));
      if (direction == 'left' || direction == 'right') {
        translateX = direction == 'left' ? translateCoords.translate[0] + speed : translateCoords.translate[0] - speed;
        translateY = translateCoords.translate[1];
      } else if (direction == 'up' || direction == 'down') {
        translateX = translateCoords.translate[0];
        translateY = direction == 'up' ? translateCoords.translate[1] + speed : translateCoords.translate[1] - speed;
      }
      scaleX = translateCoords.scale[0];
      scaleY = translateCoords.scale[1];
      scale = zoomListener.scale();
      svgGroup.transition().attr("transform", "translate(" + translateX + "," + translateY + ")scale(" + scale + ")");
      d3.select(domNode).select('g.node').attr("transform", "translate(" + translateX + "," + translateY + ")");
      zoomListener.scale(zoomListener.scale());
      zoomListener.translate([translateX, translateY]);
      panTimer = setTimeout(function () {
        pan(domNode, speed, direction);
      }, 50);
    }
  }

  // Define the zoom function for the zoomable tree

  function zoom() {
    svgGroup.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
  }


  // define the zoomListener which calls the zoom function on the "zoom" event constrained within the scaleExtents
  var zoomListener = d3.behavior.zoom().scaleExtent([0.01, 3]).on("zoom", zoom);

  function initiateDrag(d, domNode) {
    draggingNode = d;
    d3.select(domNode).select('.ghostCircle').attr('pointer-events', 'none');
    d3.selectAll('.ghostCircle').attr('class', 'ghostCircle show');
    d3.select(domNode).attr('class', 'node activeDrag');

    svgGroup.selectAll("g.node").sort(function (a, b) { // select the parent and sort the path's
      if (a.id != draggingNode.id) return 1; // a is not the hovered element, send "a" to the back
      else return -1; // a is the hovered element, bring "a" to the front
    });
    // if nodes has children, remove the links and nodes
    if (nodes.length > 1) {
      // remove link paths
      var links = tree.links(nodes);
      var nodePaths = svgGroup.selectAll("path.link")
        .data(links, function (d) {
          return d.target.id;
        }).remove();
      // remove child nodes
      var nodesExit = svgGroup.selectAll("g.node")
        .data(nodes, function (d) {
          return d.id;
        }).filter(function (d, i) {
          if (d.id == draggingNode.id) {
            return false;
          }
          return true;
        }).remove();
    }

    // remove parent link
    var parentLink = tree.links(tree.nodes(draggingNode.parent));
    svgGroup.selectAll('path.link').filter(function (d, i) {
      if (d.target.id == draggingNode.id) {
        return true;
      }
      return false;
    }).remove();

    dragStarted = null;
  }

  // define the baseSvg, attaching a class for styling and the zoomListener
  var baseSvg = d3.select("#tree-container").append("svg")
    .attr("width", viewerWidth-20)
    .attr("height", viewerHeight-20)
    .attr("class", "overlay")
    .call(zoomListener);

  // Define the drag listeners for drag/drop behaviour of nodes.
  var dragListener = d3.behavior.drag()
    .on("dragstart", function (d) {
      if (d == root) {
        return;
      }
      dragStarted = true;
      nodes = tree.nodes(d);
      d3.event.sourceEvent.stopPropagation();
      // it's important that we suppress the mouseover event on the node being dragged. Otherwise it will absorb the mouseover event and the underlying node will not detect it d3.select(this).attr('pointer-events', 'none');
    })
    .on("drag", function (d) {
      if (d == root) {
        return;
      }
      if (dragStarted) {
        domNode = this;
        initiateDrag(d, domNode);
      }

      // get coords of mouseEvent relative to svg container to allow for panning
      var relCoords = d3.mouse(document.getElementsByTagName('svg')[0]);
      if (relCoords[0] < panBoundary) {
        panTimer = true;
        pan(this, 'left');
      } else if (relCoords[0] > (document.getElementsByTagName('svg')[0].getBoundingClientRect().width - panBoundary)) {

        panTimer = true;
        pan(this, 'right');
      } else if (relCoords[1] < panBoundary) {
        panTimer = true;
        pan(this, 'up');
      } else if (relCoords[1] > (document.getElementsByTagName('svg')[0].getBoundingClientRect().height - panBoundary)) {
        panTimer = true;
        pan(this, 'down');
      } else {
        try {
          clearTimeout(panTimer);
        } catch (e) {

        }
      }

      d.x0 += d3.event.dy;
      d.y0 += d3.event.dx;
      var node = d3.select(this);
      node.attr("transform", "translate(" + d.y0 + "," + d.x0 + ")");
      updateTempConnector();
    })
    .on("dragend", function (d) {
      if (d == root) {
        return;
      }
      domNode = this;
      if (selectedNode) {
        // now remove the element from the parent, and insert it into the new elements children
        var index = draggingNode.parent.children.indexOf(draggingNode);
        if (index > -1) {
          draggingNode.parent.children.splice(index, 1);
        }
        if (typeof selectedNode.children !== 'undefined' || typeof selectedNode._children !== 'undefined') {
          if (typeof selectedNode.children !== 'undefined') {
            selectedNode.children.push(draggingNode);
          } else {
            selectedNode._children.push(draggingNode);
          }
        } else {
          selectedNode.children = [];
          selectedNode.children.push(draggingNode);
        }
        // Make sure that the node being added to is expanded so user can see added node is correctly moved
        expand(selectedNode);
        sortTree();
        endDrag();
      } else {
        endDrag();
      }
    });

  function endDrag() {
    selectedNode = null;
    d3.selectAll('.ghostCircle').attr('class', 'ghostCircle');
    d3.select(domNode).attr('class', 'node');
    // now restore the mouseover event or we won't be able to drag a 2nd time
    d3.select(domNode).select('.ghostCircle').attr('pointer-events', '');
    updateTempConnector();
    if (draggingNode !== null) {
      update(root);
      centerNode(draggingNode);
      draggingNode = null;
    }
  }

  // Helper functions for collapsing and expanding nodes.

  function collapse(d) {
    if (d.children) {
      d._children = d.children;
      d._children.forEach(collapse);
      d.children = null;
    }
  }

  function expand(d) {
    if (d._children) {
      d.children = d._children;
      d.children.forEach(expand);
      d._children = null;
    }
  }

  var overCircle = function (d) {
    selectedNode = d;
    updateTempConnector();
  };
  var outCircle = function (d) {
    selectedNode = null;
    updateTempConnector();
  };

  // Function to update the temporary connector indicating dragging affiliation
  var updateTempConnector = function () {
    var data = [];
    if (draggingNode !== null && selectedNode !== null) {
      // have to flip the source coordinates since we did this for the existing connectors on the original tree
      data = [{
        source: {
          x: selectedNode.y0,
          y: selectedNode.x0
        },
        target: {
          x: draggingNode.y0,
          y: draggingNode.x0
        }
      }];
    }
    var link = svgGroup.selectAll(".templink").data(data);

    link.enter().append("path")
      .attr("class", "templink")
      .attr("d", d3.svg.diagonal())
      .attr('pointer-events', 'none');

    link.attr("d", d3.svg.diagonal());

    link.exit().remove();
  };

  // Function to center node when clicked/dropped so node doesn't get lost when collapsing/moving with large amount of children.

  function centerNode(source) {
    var scale = zoomListener.scale();
    var x = -source.y0;
    var y = -source.x0;
    x = x * scale + viewerWidth / 2;
    y = y * scale + viewerHeight / 2;
    d3.select('g').transition()
      .duration(duration)
      .attr("transform", "translate(" + x + "," + y + ")scale(" + scale + ")");
    zoomListener.scale(scale);
    zoomListener.translate([x, y]);
  }

  // Toggle children function

  function toggleChildren(d) {
    if (d.children) {
      d._children = d.children;
      d.children = null;
    } else if (d._children) {
      d.children = d._children;
      d._children = null;
    }
    return d;
  }

  // Toggle children on click.

  function click(d) {
    if (d3.event.defaultPrevented) return; // click suppressed
    d = toggleChildren(d);
    update(d);
    centerNode(d);
  }

  function update(source) {
    // Compute the new height, function counts total children of root node and sets tree height accordingly.
    // This prevents the layout looking squashed when new nodes are made visible or looking sparse when nodes are removed
    // This makes the layout more consistent.
    var levelWidth = [1];
    var childCount = function (level, n) {

      if (n.children && n.children.length > 0) {
        if (levelWidth.length <= level + 1) levelWidth.push(0);

        levelWidth[level + 1] += n.children.length;
        n.children.forEach(function (d) {
          childCount(level + 1, d);
        });
      }
    };

    childCount(0, root);
    var newHeight = d3.max(levelWidth) * 30; // 25 pixels per line
    tree = tree.size([newHeight, viewerWidth]);

    // Compute the new tree layout.
    nodes = tree.nodes(root).reverse(),
      links = tree.links(nodes);

    // Set widths between levels based on maxLabelLength.
    nodes.forEach(function (d) {
      d.y = (d.depth * (maxLabelLength * 10)); //maxLabelLength * 10px
      // alternatively to keep a fixed scale one can set a fixed depth per level
      // Normalize for fixed-depth by commenting out below line
      // d.y = (d.depth * 500); //500px per level.
    });

    // Update the nodes…
    var node = svgGroup.selectAll("g.node")
      .data(nodes, function (d) {
        return d.id || (d.id = ++i);
      });

    // Enter any new nodes at the parent's previous position.
    var nodeEnter = node.enter().append("g")
      .call(dragListener)
      .attr("class", "node")
      .attr("transform", function (d) {
        return "translate(" + source.y0 + "," + source.x0 + ")";
      })
      .on('click', click);

    nodeEnter.append("circle")
      .attr('class', 'nodeCircle')
      .attr("r", 0)
      .style("fill", function (d) {
        return d._children ? "lightsteelblue" : "#fff";
      });

    nodeEnter.append("text")
      .attr("x", function (d) {
        return d.children || d._children ? -10 : 10;
      })
      .attr("dy", ".35em")
      .attr('class', 'nodeText')
      .attr("text-anchor", function (d) {
        return d.children || d._children ? "end" : "start";
      })
      .text(function (d) {
        return d.name;
      })
      .style("fill-opacity", 0);

    // phantom node to give us mouseover in a radius around it
    nodeEnter.append("circle")
      .attr('class', 'ghostCircle')
      .attr("r", 30)
      .attr("opacity", 0.2) // change this to zero to hide the target area
      .style("fill", "red")
      .attr('pointer-events', 'mouseover')
      .on("mouseover", function (node) {
        overCircle(node);
      })
      .on("mouseout", function (node) {
        outCircle(node);
      });

    // Update the text to reflect whether node has children or not.
    node.select('text')
      .attr("x", function (d) {
        return d.children || d._children ? -10 : 10;
      })
      .attr("text-anchor", function (d) {
        return d.children || d._children ? "end" : "start";
      })
      .text(function (d) {
        return d.name;
      });

    // Change the circle fill depending on whether it has children and is collapsed
    node.select("circle.nodeCircle")
      .attr("r", 4.5)
      .style("fill", function (d) {
        return d._children ? "lightsteelblue" : "#fff";
      });

    // Transition nodes to their new position.
    var nodeUpdate = node.transition()
      .duration(duration)
      .attr("transform", function (d) {
        return "translate(" + d.y + "," + d.x + ")";
      });

    // Fade the text in
    nodeUpdate.select("text")
      .style("fill-opacity", 1);

    // Transition exiting nodes to the parent's new position.
    var nodeExit = node.exit().transition()
      .duration(duration)
      .attr("transform", function (d) {
        return "translate(" + source.y + "," + source.x + ")";
      })
      .remove();

    nodeExit.select("circle")
      .attr("r", 0);

    nodeExit.select("text")
      .style("fill-opacity", 0);

    // Update the links…
    var link = svgGroup.selectAll("path.link")
      .data(links, function (d) {
        return d.target.id;
      });

    // Enter any new links at the parent's previous position.
    link.enter().insert("path", "g")
      .attr("class", "link")
      .attr("d", function (d) {
        var o = {
          x: source.x0,
          y: source.y0
        };
        return diagonal({
          source: o,
          target: o
        });
      });

    // Transition links to their new position.
    link.transition()
      .duration(duration)
      .attr("d", diagonal);

    // Transition exiting nodes to the parent's new position.
    link.exit().transition()
      .duration(duration)
      .attr("d", function (d) {
        var o = {
          x: source.x,
          y: source.y
        };
        return diagonal({
          source: o,
          target: o
        });
      })
      .remove();

    // Stash the old positions for transition.
    nodes.forEach(function (d) {
      d.x0 = d.x;
      d.y0 = d.y;
    });
  }

  // Append a group which holds all nodes and which the zoom Listener can act upon.
  var svgGroup = baseSvg.append("g");

  // Define the root
  root = treeData;
  root.x0 = viewerHeight / 2;
  root.y0 = 0;

  // Layout the tree initially and center on the root node.
  update(root);
  centerNode(root);

};

function init() {

  var data1 = "source,target\n" +
    "TOT01,TO1505\n" +
    "TO1505,TOPOS01\n" +
    "TO1505,TO5735\n" +
    "TOT01,BMT04\n" +
    "BM3527,BMT04\n" +
    "TOT01,TO5742\n" +
    "TOT01,TO1587\n" +
    "TOT01,TO1502\n" +
    "TOT01,TO1501\n" +
    "TOT01,TO1507\n" +
    "TOT01,TO5610\n" +
    "TOT01,TO1599\n" +
    "TOT01,TO5759\n" +
    "TOT01,TO1528\n" +
    "TOT01,TO5758\n" +
    "TO1529,TOT01\n" +
    "TOT01,TO1589\n" +
    "TOT01,TO1588\n" +
    "TOT01,TOT07\n" +
    "TOT01,TOT12\n" +
    "TO1587,TO5603\n" +
    "TO1587,TO5604\n" +
    "TO1587,TO1500\n" +
    "TO1587,TO5717\n" +
    "TO1502,TO1503\n" +
    "TO1502,TO5713\n" +
    "TO1501,TO1560\n" +
    "TO1547,TO1501\n" +
    "TO1501,TO5729\n" +
    "TO1507,TO1508\n" +
    "TO1507,TO1530\n" +
    "TO1507,TO5703\n" +
    "TO1599,TO5731\n" +
    "TO1599,TO5601\n" +
    "TO1528,TO1517\n" +
    "TO1528,TO1526\n" +
    "TO1528,TO1552\n" +
    "TO1528,TO1593\n" +
    "TO1528,TO5704\n" +
    "TO1529,TO5606\n" +
    "TO1589,TO5736\n" +
    "TO1589,TO5743\n" +
    "TO1588,TO5737\n" +
    "TO1588,TO1595\n" +
    "TOT07,TOT09\n" +
    "TOT07,TO1537\n" +
    "TOT07,TO5702\n" +
    "TOT07,TO1533\n" +
    "TOT07,TO1598\n" +
    "TOT07,TO5722\n" +
    "TOT07,TO5725\n" +
    "TOT12,TO1562\n" +
    "TOT12,TO1535\n" +
    "TO1586,TOT12\n" +
    "TO5603,TO5708\n" +
    "TO5603,TO5602\n" +
    "TO5603,TO5734\n" +
    "TO1503,TO1506\n" +
    "TO1503,TO5611\n" +
    "TO5713,TO5710\n" +
    "TO1560,TO1509\n" +
    "TO1560,TO1591\n" +
    "TO1547,TO1519\n" +
    "TO1547,TO1564\n" +
    "TO1547,TO1542\n" +
    "TO5703,TO5749\n" +
    "TO5731,TO5757\n" +
    "TO1517,TO1524\n" +
    "TO1517,TO1545\n" +
    "TO1517,TO1534\n" +
    "TO1526,TO5705\n" +
    "TO1526,TO5707\n" +
    "TO1526,TO5746\n" +
    "TO1552,TO1513\n" +
    "TO1552,TO5701\n" +
    "TO1552,TO1579\n" +
    "TO5736,TO5733\n" +
    "TO5736,TO5716\n" +
    "TO1595,TO5605\n" +
    "TOT09,TO1521\n" +
    "TOT09,TO5772\n" +
    "TOT09,TO1550\n" +
    "TO1537,TO1538\n" +
    "TO1562,TO5712\n" +
    "TO5711,TO1562\n" +
    "TO1562,TO5748\n" +
    "TO1586,TO1590\n" +
    "TO1586,TO5780\n" +
    "TO5708,TO5730\n" +
    "TOPOS04,TO5734\n" +
    "TO1506,TO5607\n" +
    "TO1509,TO1597\n" +
    "TO1519,TO1543\n" +
    "TO1542,TO1532\n" +
    "TO1542,TO5745\n" +
    "TO1542,TO1554\n" +
    "TO1542,TO1541\n" +
    "TO1542,TO1558\n" +
    "TO1524,TO1516\n" +
    "TO1524,TO5741\n" +
    "TO5705,TO5700\n" +
    "TO5733,TOT14\n" +
    "TO5716,TO5738\n" +
    "TO1521,TO5724\n" +
    "TO1521,TO5723\n" +
    "TO1550,TO1539\n" +
    "TO1550,TO1551\n" +
    "TO1550,TOT11\n" +
    "TO5607,TO5608\n" +
    "TO1555,TO1532\n" +
    "TO1532,TO1518\n" +
    "TOT14,TO5616\n" +
    "TOT11,TO1536\n";

  var csv = d3.csv.parse(data1);
  var links = makeTree(csv);
  var example = {
    "name": "TOT01",
    "children": [
      {
        "name": "TO1505",
        "children": [
          {
            "name": "TOPOS01"
          },
          {
            "name": "TO5735"
          }
        ]
      }
    ]
  }
  var root = links[0].source;
  // var treeJSON = dndTree(root);
  // var treeJSON = dndTree(example);
  var treeJSON = dndTree(treeJson);
}
init();
